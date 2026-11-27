/**
 * CYT Fredericksburg MyCYT Admin -> Neon PostgreSQL Idempotent Importer
 *
 * Reads the local gitignored export `scripts/.cytfred-full-export.json`
 * (created by `npm run export:cytfred-admin`) and idempotently enriches / upserts:
 *   1. Venues (Theaters & Class Locations with addresses)
 *   2. People (backfills missing headshots, DOB, gender, t-shirt size, MyCYT IDs;
 *      adds missing people without touching existing passwords or Admin roles)
 *   3. Productions (matches existing `cytfred` shows by title + season/year, backfills
 *      missing banner artwork, venue links, exact opening/closing dates, cast sizes)
 *   4. Performances (exact dates, inventory, real ticketsSold counts)
 *   5. Artistic Team (`staff_positions` + `show_team`)
 *   6. Blueprint Roles & Cast Assignments (`master_shows`, `blueprint_roles`, `assignments`)
 *   7. Historical Audition Records (`auditions`)
 *   8. Academy Sessions & Classes (`sessions`, `classes`)
 *
 * Usage:
 *   # Dry-run preview (no DB writes):
 *   npm run import:cytfred-admin -- --dry-run
 *
 *   # Live sync into Neon PostgreSQL:
 *   npm run import:cytfred-admin
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "node:fs";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "../db";

const EXPORT_PATH = path.join(process.cwd(), "scripts", ".cytfred-full-export.json");
const TENANT_SLUG = "cytfred";
const DRY_RUN = process.argv.includes("--dry-run");

function norm(s: string | null | undefined): string {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function cleanSessionLabel(raw: string): string {
  // e.g. "Winter 2025Fredericksburg" -> "Winter 2025"
  const m = raw.match(/(Fall|Winter|Spring|Summer)\s+(20\d{2})/i);
  if (m) return `${m[1][0].toUpperCase()}${m[1].slice(1).toLowerCase()} ${m[2]}`;
  return raw.replace(/Fredericksburg|Stafford|Spotsylvania/gi, "").trim();
}

function seasonNameFromSession(sessionLabel: string): string | null {
  const m = sessionLabel.match(/(Fall|Winter|Spring|Summer)\s+(20\d{2})/i);
  if (!m) return null;
  const term = m[1].toLowerCase();
  const yr = parseInt(m[2], 10);
  return term === "fall" ? `${yr}-${yr + 1}` : `${yr - 1}-${yr}`;
}

function parseMyCytPerformanceDate(label: string): Date | null {
  // Matches e.g. "Nov 14, 2026 @ 2:00pm" or "Feb 26, 2027 @ 7:00pm"
  const m = label.match(
    /([A-Za-z]{3})\s+(\d{1,2}),?\s+(20\d{2})\s*@?\s*(\d{1,2}):(\d{2})\s*(am|pm)/i
  );
  if (!m) return null;
  const months: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };
  const mo = months[m[1].toLowerCase()];
  if (mo === undefined) return null;
  const day = parseInt(m[2], 10);
  const year = parseInt(m[3], 10);
  let hr = parseInt(m[4], 10);
  const min = parseInt(m[5], 10);
  const ap = m[6].toLowerCase();
  if (ap === "pm" && hr !== 12) hr += 12;
  if (ap === "am" && hr === 12) hr = 0;
  return new Date(Date.UTC(year, mo, day, hr + 5, min, 0));
}

function cleanVenueName(raw: string): string {
  return raw.replace(/\s*Chapters:.*$/i, "").trim();
}

function cleanRolePosition(raw: string): string {
  return raw.replace(/\s+\d+$/, "").trim();
}

function splitName(fullName: string): { firstName: string; lastName: string; fullName: string } {
  const clean = fullName.replace(/\s+/g, " ").trim();
  const parts = clean.split(" ");
  if (parts.length <= 1) return { firstName: clean, lastName: "", fullName: clean };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
    fullName: clean,
  };
}

async function main() {
  if (!fs.existsSync(EXPORT_PATH)) {
    throw new Error(`Export file not found: ${EXPORT_PATH}. Run "npm run export:cytfred-admin" first.`);
  }

  const raw = JSON.parse(fs.readFileSync(EXPORT_PATH, "utf8"));
  const db = getDb();

  const [org] = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.slug, TENANT_SLUG))
    .limit(1);
  if (!org) throw new Error(`Organization "${TENANT_SLUG}" not found.`);

  console.log(`\n================================================`);
  console.log(`CYT Fredericksburg MyCYT -> Neon Importer ${DRY_RUN ? "[DRY RUN]" : "[LIVE]"}`);
  console.log(`Org: ${org.name} (id=${org.id})`);
  console.log(`================================================\n`);

  const stats = {
    venuesCreated: 0,
    venuesUpdated: 0,
    peopleUpdated: 0,
    peopleCreated: 0,
    showsMatched: 0,
    showsSkippedJunk: 0,
    showsCreated: 0,
    showsUpdatedArtwork: 0,
    showsUpdatedDates: 0,
    perfsCreated: 0,
    perfsUpdatedSold: 0,
    teamCreated: 0,
    rolesCreated: 0,
    assignmentsCreated: 0,
    auditionsCreated: 0,
    sessionsCreated: 0,
    classesCreated: 0,
  };

  // ===========================================================================
  // 1. VENUES
  // ===========================================================================
  const existingVenues = await db
    .select()
    .from(schema.venues)
    .where(eq(schema.venues.organizationId, org.id));
  const venueByNorm = new Map<string, (typeof existingVenues)[number]>();
  for (const v of existingVenues) venueByNorm.set(norm(v.name), v);

  for (const loc of raw.locations || []) {
    const cleanName = cleanVenueName(loc.name || "");
    if (!cleanName) continue;
    const addrParts = [loc.address, loc.city, loc.state, loc.zip].filter(Boolean);
    const fullAddr = addrParts.length > 0 ? `${loc.address || ""}${loc.city ? `, ${loc.city}` : ""}${loc.state ? `, ${loc.state}` : ""}${loc.zip ? ` ${loc.zip}` : ""}`.replace(/^,\s*/, "").trim() : null;
    const venueType = loc.kind === "theater" ? "Theater" : "Class Location";

    const existing = venueByNorm.get(norm(cleanName));
    if (existing) {
      const updates: Record<string, any> = {};
      if (!existing.address && fullAddr) updates.address = fullAddr;
      if (!existing.type) updates.type = venueType;
      if (Object.keys(updates).length > 0) {
        if (!DRY_RUN) {
          await db.update(schema.venues).set(updates).where(eq(schema.venues.id, existing.id));
        }
        stats.venuesUpdated++;
      }
    } else {
      if (!DRY_RUN) {
        const [created] = await db
          .insert(schema.venues)
          .values({
            organizationId: org.id,
            name: cleanName,
            address: fullAddr,
            type: venueType,
          })
          .returning();
        venueByNorm.set(norm(cleanName), created);
      }
      stats.venuesCreated++;
    }
  }
  console.log(`[1/5] Venues: +${stats.venuesCreated} created, ${stats.venuesUpdated} updated`);

  // ===========================================================================
  // 2. PEOPLE (enrich from users + auditionees; never overwrite passwords/roles)
  // ===========================================================================
  const existingPeople = await db
    .select()
    .from(schema.people)
    .where(eq(schema.people.organizationId, org.id));

  const personByExtId = new Map<string, (typeof existingPeople)[number]>();
  const personByNameEmail = new Map<string, (typeof existingPeople)[number]>();
  const personByNormName = new Map<string, (typeof existingPeople)[number]>();
  const personByEmail = new Map<string, (typeof existingPeople)[number]>();

  const indexPerson = (p: (typeof existingPeople)[number]) => {
    if (p.externalUserId) personByExtId.set(p.externalUserId, p);
    const nName = norm(p.fullName || `${p.firstName} ${p.lastName}`);
    const nEmail = (p.email || "").trim().toLowerCase();
    if (nName && nEmail) personByNameEmail.set(`${nName}|${nEmail}`, p);
    if (nName && !personByNormName.has(nName)) personByNormName.set(nName, p);
    if (nEmail && !personByEmail.has(nEmail)) personByEmail.set(nEmail, p);
  };
  for (const p of existingPeople) indexPerson(p);

  // Merge auditionee enrichment (dob, shirtSize, gender, headshot) by mycytPersonId
  const audMetaByPersonId = new Map<
    number,
    { dob?: string; shirtSize?: string; gender?: string; headshotUrl?: string | null; email?: string }
  >();
  for (const sh of raw.shows || []) {
    for (const a of sh.auditionees || []) {
      if (!a.mycytPersonId) continue;
      const cur = audMetaByPersonId.get(a.mycytPersonId) || {};
      if (!cur.dob && a.dob) cur.dob = a.dob;
      if (!cur.shirtSize && a.shirtSize) cur.shirtSize = a.shirtSize;
      if (!cur.gender && a.gender) cur.gender = a.gender;
      if (!cur.headshotUrl && a.headshotUrl) cur.headshotUrl = a.headshotUrl;
      if (!cur.email && a.email) cur.email = a.email;
      audMetaByPersonId.set(a.mycytPersonId, cur);
    }
  }

  // Deduplicate incoming MyCYT users by mycytPersonId (or name+email)
  const seenMyCytPeople = new Set<string>();
  const toInsertPeople: (typeof schema.people.$inferInsert)[] = [];

  for (const u of raw.users || []) {
    const firstName = (u.firstName || "").trim();
    const lastName = (u.lastName || "").trim();
    const fullName = `${firstName} ${lastName}`.trim();
    if (!fullName || fullName === ".") continue;

    const extId = u.mycytPersonId ? String(u.mycytPersonId) : null;
    const extFam = u.mycytFamilyId ? String(u.mycytFamilyId) : null;
    const email = (u.email || "").trim().toLowerCase() || null;
    const dedupeKey = extId ? `id:${extId}` : `ne:${norm(fullName)}|${email || ""}`;
    if (seenMyCytPeople.has(dedupeKey)) continue;
    seenMyCytPeople.add(dedupeKey);

    const audMeta = u.mycytPersonId ? audMetaByPersonId.get(u.mycytPersonId) : undefined;
    const headshot =
      (u.headshotUrl && !u.headshotUrl.includes("default") ? u.headshotUrl : null) ||
      audMeta?.headshotUrl ||
      null;
    const dob = audMeta?.dob || null;
    const tShirtSize = audMeta?.shirtSize || null;
    const gender = audMeta?.gender || null;

    const existing =
      (extId ? personByExtId.get(extId) : undefined) ||
      (email ? personByNameEmail.get(`${norm(fullName)}|${email}`) : undefined) ||
      personByNormName.get(norm(fullName));

    if (existing) {
      const updates: Record<string, any> = {};
      if (!existing.headshotUrl && headshot) updates.headshotUrl = headshot;
      if (!existing.dateOfBirth && dob) updates.dateOfBirth = dob;
      if (!existing.tShirtSize && tShirtSize) updates.tShirtSize = tShirtSize;
      if (!existing.gender && gender) updates.gender = gender;
      if (!existing.externalUserId && extId) updates.externalUserId = extId;
      if (!existing.externalFamilyAccount && extFam) updates.externalFamilyAccount = extFam;
      if (!existing.email && email) updates.email = email;

      if (Object.keys(updates).length > 0) {
        if (!DRY_RUN) {
          await db.update(schema.people).set(updates).where(eq(schema.people.id, existing.id));
          Object.assign(existing, updates);
          indexPerson(existing);
        }
        stats.peopleUpdated++;
      }
    } else {
      toInsertPeople.push({
        organizationId: org.id,
        firstName,
        lastName,
        fullName,
        email,
        headshotUrl: headshot,
        dateOfBirth: dob,
        tShirtSize,
        gender,
        externalUserId: extId,
        externalFamilyAccount: extFam,
        roles: ["Member"],
      });
    }
  }

  if (toInsertPeople.length > 0) {
    stats.peopleCreated = toInsertPeople.length;
    if (!DRY_RUN) {
      const chunkSize = 200;
      for (let i = 0; i < toInsertPeople.length; i += chunkSize) {
        const chunk = toInsertPeople.slice(i, i + chunkSize);
        const inserted = await db.insert(schema.people).values(chunk).returning();
        for (const p of inserted) indexPerson(p);
      }
    }
  }
  console.log(
    `[2/5] People: +${stats.peopleCreated} created, ${stats.peopleUpdated} enriched (total indexed: ${existingPeople.length + (DRY_RUN ? 0 : stats.peopleCreated)})`
  );

  // Helper to resolve or create a person by name (for cast / artistic team)
  async function ensurePersonByName(fullNameRaw: string, fallbackRole = "Student"): Promise<number | null> {
    const clean = fullNameRaw.replace(/\s+/g, " ").trim();
    if (!clean) return null;
    const existing = personByNormName.get(norm(clean));
    if (existing) return existing.id;
    if (DRY_RUN) return -1;
    const { firstName, lastName, fullName } = splitName(clean);
    const [created] = await db
      .insert(schema.people)
      .values({
        organizationId: org.id,
        firstName,
        lastName,
        fullName,
        roles: [fallbackRole],
      })
      .returning();
    indexPerson(created);
    stats.peopleCreated++;
    return created.id;
  }

  // ===========================================================================
  // 3. SHOWS, PERFORMANCES, ARTISTIC TEAM, ROLES, CAST, AUDITIONS
  // ===========================================================================
  const existingSeasons = await db
    .select()
    .from(schema.seasons)
    .where(eq(schema.seasons.organizationId, org.id));
  const seasonByName = new Map(existingSeasons.map((s) => [s.name.toLowerCase(), s]));

  const existingProds = await db
    .select()
    .from(schema.productions)
    .where(eq(schema.productions.organizationId, org.id));

  const existingMasterShows = await db
    .select()
    .from(schema.masterShows)
    .where(eq(schema.masterShows.organizationId, org.id));
  const masterByNorm = new Map(existingMasterShows.map((m) => [norm(m.title), m]));

  const existingStaffPositions = await db
    .select()
    .from(schema.staffPositions)
    .where(eq(schema.staffPositions.organizationId, org.id));
  const posByNorm = new Map(existingStaffPositions.map((p) => [norm(p.roleName), p]));

  const now = new Date();

  for (const sh of raw.shows || []) {
    const rawTitle = (sh.title || "").trim();
    if (!rawTitle || /^do not use/i.test(rawTitle) || /\btest\b/i.test(rawTitle)) {
      stats.showsSkippedJunk++;
      continue;
    }

    const sessionLabel = cleanSessionLabel(sh.sessionName || "");
    const targetSeasonName = seasonNameFromSession(sessionLabel);
    const targetSeason = targetSeasonName ? seasonByName.get(targetSeasonName.toLowerCase()) : undefined;
    const normTitle = norm(rawTitle);

    // Match existing production: prefer exact title + matching season/session, then exact title
    let prod = existingProds.find(
      (p) =>
        norm(p.title) === normTitle &&
        ((targetSeason && p.seasonId === targetSeason.id) ||
          (sessionLabel && norm(p.sessionLabel) === norm(sessionLabel)))
    );
    if (!prod) {
      // Try prefix/fuzzy match in same season (e.g. "Wizard of Oz" vs "The Wizard of Oz", "The Little Mermaid" vs "Little Mermaid Jr.")
      const stripNoise = (s: string) =>
        norm(s).replace(/^(disney s |the )+/, "").replace(/\b(jr|kids|the musical)\b/g, "").replace(/\s+/g, " ").trim();
      const coreTitle = stripNoise(rawTitle);
      prod = existingProds.find(
        (p) =>
          targetSeason &&
          p.seasonId === targetSeason.id &&
          (norm(p.title).includes(normTitle) ||
            normTitle.includes(norm(p.title)) ||
            (coreTitle.length >= 4 && stripNoise(p.title) === coreTitle))
      );
    }

    // Parse performance dates to compute opening & closing night
    const parsedPerfs = (sh.performances || [])
      .map((pf: any) => ({
        ...pf,
        dateObj: parseMyCytPerformanceDate(pf.dateLabel || ""),
      }))
      .sort((a: any, b: any) => (a.dateObj?.getTime() || 0) - (b.dateObj?.getTime() || 0));

    const validDates = parsedPerfs.filter((pf: any) => pf.dateObj);
    const openingNight = validDates[0]?.dateObj ? validDates[0].dateObj.toISOString().slice(0, 10) : null;
    const closingNight =
      validDates[validDates.length - 1]?.dateObj
        ? validDates[validDates.length - 1].dateObj.toISOString().slice(0, 10)
        : null;

    const venueClean = cleanVenueName(sh.venue || "");
    const matchedVenue = venueClean && venueClean !== "TBD" ? venueByNorm.get(norm(venueClean)) : undefined;

    const totalCastCount = (sh.characters || []).reduce(
      (sum: number, c: any) => sum + (c.actors?.length || 0),
      0
    );

    if (!prod) {
      const isFuture = closingNight ? new Date(closingNight) >= now : false;
      stats.showsCreated++;
      if (!DRY_RUN) {
        const [created] = await db
          .insert(schema.productions)
          .values({
            organizationId: org.id,
            title: rawTitle,
            seasonId: targetSeason?.id ?? null,
            sessionLabel: sessionLabel || null,
            status: isFuture ? "Upcoming" : "Archived",
            location: venueClean || null,
            venueId: matchedVenue?.id ?? null,
            showImageUrl: sh.bannerUrl || null,
            openingNight,
            closingNight,
            historicalCastSize: totalCastCount > 0 ? totalCastCount : null,
          })
          .returning();
        prod = created;
        existingProds.push(created);
      }
    } else {
      stats.showsMatched++;
      const updates: Record<string, any> = {};
      if (!prod.showImageUrl && sh.bannerUrl) {
        updates.showImageUrl = sh.bannerUrl;
        stats.showsUpdatedArtwork++;
      }
      if (!prod.openingNight && openingNight) {
        updates.openingNight = openingNight;
        stats.showsUpdatedDates++;
      }
      if (!prod.closingNight && closingNight) {
        updates.closingNight = closingNight;
      }
      if (!prod.sessionLabel && sessionLabel) updates.sessionLabel = sessionLabel;
      if (!prod.seasonId && targetSeason) updates.seasonId = targetSeason.id;
      if (!prod.venueId && matchedVenue) updates.venueId = matchedVenue.id;
      if ((!prod.location || prod.location === "TBD") && venueClean && venueClean !== "TBD") {
        updates.location = venueClean;
      }
      if (!prod.historicalCastSize && totalCastCount > 0) {
        updates.historicalCastSize = totalCastCount;
      }

      if (Object.keys(updates).length > 0 && !DRY_RUN) {
        await db.update(schema.productions).set(updates).where(eq(schema.productions.id, prod.id));
        Object.assign(prod, updates);
      }
    }

    if (!prod) continue; // DRY_RUN newly-created show

    // 3A. Performances
    const existingPerfs = await db
      .select()
      .from(schema.performances)
      .where(
        and(
          eq(schema.performances.organizationId, org.id),
          eq(schema.performances.productionId, prod.id)
        )
      );

    for (const pf of parsedPerfs) {
      const isoDate = pf.dateObj ? pf.dateObj.toISOString() : null;
      const match = existingPerfs.find(
        (ep) => (isoDate && ep.performanceDate === isoDate) || norm(ep.label) === norm(pf.dateLabel)
      );
      if (match) {
        if ((match.ticketsSold || 0) === 0 && pf.totalSold > 0) {
          if (!DRY_RUN) {
            await db
              .update(schema.performances)
              .set({
                ticketsSold: pf.totalSold,
                totalInventory: pf.totalTickets || match.totalInventory,
              })
              .where(eq(schema.performances.id, match.id));
          }
          stats.perfsUpdatedSold++;
        }
      } else {
        const isFuture = pf.dateObj ? pf.dateObj >= now : false;
        if (!DRY_RUN) {
          await db.insert(schema.performances).values({
            organizationId: org.id,
            productionId: prod.id,
            label: pf.dateLabel,
            performanceDate: isoDate,
            ticketPrice: prod.ticketPriceStandard || 18,
            totalInventory: pf.totalTickets || 300,
            ticketsSold: pf.totalSold || 0,
            salesOpen: isFuture,
          });
        }
        stats.perfsCreated++;
      }
    }

    // 3B. Artistic Team -> show_team
    if ((sh.artisticTeam || []).length > 0) {
      const existingTeam = await db
        .select()
        .from(schema.showTeam)
        .where(
          and(eq(schema.showTeam.organizationId, org.id), eq(schema.showTeam.productionId, prod.id))
        );

      for (const member of sh.artisticTeam) {
        const posName = cleanRolePosition(member.role || "");
        if (!posName || !member.name) continue;
        let pos = posByNorm.get(norm(posName));
        if (!pos && !DRY_RUN) {
          const [createdPos] = await db
            .insert(schema.staffPositions)
            .values({ organizationId: org.id, roleName: posName, department: "Artistic" })
            .returning();
          pos = createdPos;
          posByNorm.set(norm(posName), createdPos);
        }
        const personId = await ensurePersonByName(member.name, "Staff");
        if (!personId || personId < 0 || !pos) continue;

        const already = existingTeam.some(
          (t) => t.personId === personId && t.positionId === pos!.id
        );
        if (!already) {
          if (!DRY_RUN) {
            await db.insert(schema.showTeam).values({
              organizationId: org.id,
              productionId: prod.id,
              personId,
              positionId: pos.id,
              status: "Active",
            });
          }
          existingTeam.push({
            id: -1,
            organizationId: org.id,
            baserowId: null,
            productionId: prod.id,
            personId,
            positionId: pos.id,
            status: "Active",
            createdAt: now,
          });
          stats.teamCreated++;
        }
      }
    }

    // 3C. Characters & Cast Assignments
    if ((sh.characters || []).length > 0) {
      let masterShowId = prod.masterShowId;
      if (!masterShowId) {
        let master = masterByNorm.get(norm(prod.title));
        if (!master && !DRY_RUN) {
          const [createdMaster] = await db
            .insert(schema.masterShows)
            .values({ organizationId: org.id, title: prod.title })
            .returning();
          master = createdMaster;
          masterByNorm.set(norm(prod.title), createdMaster);
        }
        if (master) {
          masterShowId = master.id;
          if (!DRY_RUN) {
            await db
              .update(schema.productions)
              .set({ masterShowId })
              .where(eq(schema.productions.id, prod.id));
            prod.masterShowId = masterShowId;
          }
        }
      }

      if (masterShowId) {
        const existingRoles = await db
          .select()
          .from(schema.blueprintRoles)
          .where(
            and(
              eq(schema.blueprintRoles.organizationId, org.id),
              eq(schema.blueprintRoles.masterShowId, masterShowId)
            )
          );
        const roleByNorm = new Map(existingRoles.map((r) => [norm(r.roleName), r]));

        const existingAssigns = await db
          .select({
            personId: schema.assignments.personId,
            roleId: schema.assignments.roleId,
          })
          .from(schema.assignments)
          .where(
            and(
              eq(schema.assignments.organizationId, org.id),
              eq(schema.assignments.productionId, prod.id)
            )
          );
        const assignKeySet = new Set(existingAssigns.map((a) => `${a.personId}|${a.roleId}`));

        const batchAssigns: (typeof schema.assignments.$inferInsert)[] = [];

        for (const ch of sh.characters) {
          const roleName = (ch.role || "").trim();
          if (!roleName) continue;

          let role = roleByNorm.get(norm(roleName));
          if (!role) {
            stats.rolesCreated++;
            if (!DRY_RUN) {
              const [createdRole] = await db
                .insert(schema.blueprintRoles)
                .values({
                  organizationId: org.id,
                  masterShowId,
                  roleName,
                  roleType: "Character",
                })
                .returning();
              role = createdRole;
              roleByNorm.set(norm(roleName), createdRole);
            }
          }

          for (const actorName of ch.actors || []) {
            const personId = await ensurePersonByName(actorName, "Student");
            if (!personId || personId < 0 || !role) continue;
            const key = `${personId}|${role.id}`;
            if (assignKeySet.has(key)) continue;
            assignKeySet.add(key);
            batchAssigns.push({
              organizationId: org.id,
              productionId: prod.id,
              personId,
              roleId: role.id,
              castTrack: "All",
            });
          }
        }

        if (batchAssigns.length > 0) {
          stats.assignmentsCreated += batchAssigns.length;
          if (!DRY_RUN) {
            for (let i = 0; i < batchAssigns.length; i += 200) {
              await db.insert(schema.assignments).values(batchAssigns.slice(i, i + 200));
            }
          }
        }
      }
    }

    // 3D. Historical Auditions
    if ((sh.auditionees || []).length > 0) {
      const existingAuds = await db
        .select({ performerId: schema.auditions.performerId })
        .from(schema.auditions)
        .where(
          and(
            eq(schema.auditions.organizationId, org.id),
            eq(schema.auditions.productionId, prod.id)
          )
        );
      const audPerformerSet = new Set(existingAuds.map((a) => a.performerId));
      const batchAuds: (typeof schema.auditions.$inferInsert)[] = [];

      for (const a of sh.auditionees) {
        const fullName = `${a.firstName || ""} ${a.lastName || ""}`.trim();
        const extId = a.mycytPersonId ? String(a.mycytPersonId) : null;
        const p =
          (extId ? personByExtId.get(extId) : undefined) || personByNormName.get(norm(fullName));
        const personId = p ? p.id : await ensurePersonByName(fullName, "Student");
        if (!personId || personId < 0 || audPerformerSet.has(personId)) continue;
        audPerformerSet.add(personId);
        batchAuds.push({
          organizationId: org.id,
          productionId: prod.id,
          performerId: personId,
          status: "Submitted",
          checkedIn: true,
        });
      }

      if (batchAuds.length > 0) {
        stats.auditionsCreated += batchAuds.length;
        if (!DRY_RUN) {
          for (let i = 0; i < batchAuds.length; i += 200) {
            await db.insert(schema.auditions).values(batchAuds.slice(i, i + 200));
          }
        }
      }
    }
  }

  console.log(
    `[3/5] Shows: ${stats.showsMatched} matched, +${stats.showsCreated} created (${stats.showsSkippedJunk} junk skipped)`
  );
  console.log(
    `      Backfilled: ${stats.showsUpdatedArtwork} banners, ${stats.showsUpdatedDates} opening dates, +${stats.perfsCreated} perfs (${stats.perfsUpdatedSold} sold counts updated)`
  );
  console.log(
    `      Cast/Team:  +${stats.teamCreated} artistic team, +${stats.rolesCreated} roles, +${stats.assignmentsCreated} cast assignments, +${stats.auditionsCreated} auditions`
  );

  // ===========================================================================
  // 4. ACADEMY SESSIONS & CLASSES
  // ===========================================================================
  const existingSessions = await db
    .select()
    .from(schema.sessions)
    .where(eq(schema.sessions.organizationId, org.id));
  const sessionByNorm = new Map(existingSessions.map((s) => [norm(s.name), s]));

  const existingClasses = await db
    .select({
      id: schema.classes.id,
      className: schema.classes.className,
      sessionId: schema.classes.sessionId,
      location: schema.classes.location,
      day: schema.classes.day,
      teacherId: schema.classes.teacherId,
      timeSlot: schema.classes.timeSlot,
    })
    .from(schema.classes)
    .where(eq(schema.classes.organizationId, org.id));
  const classByKey = new Map(
    existingClasses.map((c) => [`${c.sessionId || 0}|${norm(c.className)}`, c])
  );

  const inferDayFromTimeSlot = (ts?: string | null): string | null => {
    if (!ts) return null;
    const explicit = ts.match(/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)(?:day|sday|nesday|rsday|urday)?\b/i);
    if (explicit) return explicit[1][0].toUpperCase() + explicit[1].slice(1, 3).toLowerCase();
    const dm = ts.match(/([A-Za-z]{3})\s+(\d{1,2}),\s*(\d{2,4})/);
    if (dm) {
      const yr = dm[3].length === 2 ? 2000 + parseInt(dm[3], 10) : parseInt(dm[3], 10);
      const parsed = new Date(`${dm[1]} ${dm[2]}, ${yr} 12:00:00 UTC`);
      if (!Number.isNaN(parsed.getTime())) {
        return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][parsed.getUTCDay()];
      }
    }
    return null;
  };

  let classesUpdatedLoc = 0;
  let classesUpdatedDay = 0;
  const pendingEnrollments: { classKey: string; students: any[] }[] = [];
  const batchClasses: (typeof schema.classes.$inferInsert)[] = [];

  for (const cls of raw.classes || []) {
    const className = (cls.name || "").trim();
    if (!className) continue;

    // Infer session label from sessionName or timeSlot start date (e.g. "Aug 24, 21" -> "Fall 2021")
    let sesLabel = cleanSessionLabel(cls.sessionName || "");
    if (!sesLabel && cls.timeSlot) {
      const dm = cls.timeSlot.match(/([A-Za-z]{3})\s+\d{1,2},\s*(\d{2})/);
      if (dm) {
        const mo = dm[1].toLowerCase();
        const yr = 2000 + parseInt(dm[2], 10);
        const term =
          ["aug", "sep", "oct", "nov"].includes(mo)
            ? "Fall"
            : ["dec", "jan", "feb"].includes(mo)
              ? "Winter"
              : ["mar", "apr", "may"].includes(mo)
                ? "Spring"
                : "Summer";
        sesLabel = `${term} ${yr}`;
      }
    }
    if (!sesLabel) sesLabel = "Historical Classes";

    let ses = sessionByNorm.get(norm(sesLabel));
    if (!ses) {
      stats.sessionsCreated++;
      if (!DRY_RUN) {
        const sName = seasonNameFromSession(sesLabel);
        const matchedSeason = sName ? seasonByName.get(sName.toLowerCase()) : undefined;
        const [createdSes] = await db
          .insert(schema.sessions)
          .values({
            organizationId: org.id,
            seasonId: matchedSeason?.id ?? null,
            name: sesLabel,
            isActive: /2027|Fall 2026/i.test(sesLabel),
          })
          .returning();
        ses = createdSes;
        sessionByNorm.set(norm(sesLabel), createdSes);
      }
    }

    const sesId = ses?.id ?? 0;
    const key = `${sesId}|${norm(className)}`;
    const resolvedLocation = cls.locationName || cls.chapter || "Fredericksburg";
    const inferredDay = inferDayFromTimeSlot(cls.timeSlot);
    const teacher = cls.teacherEmail ? personByEmail.get(cls.teacherEmail.trim().toLowerCase()) : undefined;

    if (Array.isArray(cls.roster) && cls.roster.length > 0) {
      pendingEnrollments.push({ classKey: key, students: cls.roster });
    }

    const existingClass = classByKey.get(key);
    if (existingClass) {
      const updates: Record<string, any> = {};
      if (
        cls.locationName &&
        (!existingClass.location ||
          existingClass.location === "Fredericksburg" ||
          existingClass.location === "Stafford" ||
          existingClass.location === "TBD")
      ) {
        updates.location = cls.locationName;
        classesUpdatedLoc++;
      }
      if (inferredDay && (!existingClass.day || existingClass.day === "TBD")) {
        updates.day = inferredDay;
        classesUpdatedDay++;
      }
      if (!existingClass.teacherId && teacher?.id) {
        updates.teacherId = teacher.id;
      }
      if (Object.keys(updates).length > 0 && !DRY_RUN) {
        await db.update(schema.classes).set(updates).where(eq(schema.classes.id, existingClass.id));
      }
      continue;
    }

    const ageMatch = (cls.ages || "").match(/(\d+)\s*-\s*(\d+)/);
    const capMatch = (cls.enrollment || "").match(/\/\s*(\d+)/);
    const timeMatch = (cls.timeSlot || "").match(/(\d{1,2}:\d{2}\s*[AP]M\s*-\s*\d{1,2}:\d{2}\s*[AP]M)/i);

    classByKey.set(key, {
      id: -1,
      className,
      sessionId: ses?.id ?? null,
      location: resolvedLocation,
      day: inferredDay,
      teacherId: teacher?.id ?? null,
      timeSlot: timeMatch ? timeMatch[1] : cls.timeSlot || null,
    });

    batchClasses.push({
      organizationId: org.id,
      sessionId: ses?.id ?? null,
      teacherId: teacher?.id ?? null,
      className,
      location: resolvedLocation,
      day: inferredDay,
      timeSlot: timeMatch ? timeMatch[1] : cls.timeSlot || null,
      minAge: ageMatch ? parseInt(ageMatch[1], 10) : null,
      maxAge: ageMatch ? parseInt(ageMatch[2], 10) : null,
      capacity: capMatch ? parseInt(capMatch[1], 10) : 20,
      status: /2027/i.test(sesLabel) ? "Active" : "Archived",
    });
  }

  if (batchClasses.length > 0) {
    stats.classesCreated = batchClasses.length;
    if (!DRY_RUN) {
      for (let i = 0; i < batchClasses.length; i += 200) {
        const inserted = await db
          .insert(schema.classes)
          .values(batchClasses.slice(i, i + 200))
          .returning({
            id: schema.classes.id,
            sessionId: schema.classes.sessionId,
            className: schema.classes.className,
          });
        for (const ic of inserted) {
          const k = `${ic.sessionId || 0}|${norm(ic.className)}`;
          const prev = classByKey.get(k);
          if (prev) prev.id = ic.id;
        }
      }
    }
  }

  // Upsert class student enrollments (idempotent via unique index on org + class + student)
  let enrollmentsQueued = 0;
  const batchEnrollments: (typeof schema.classEnrollments.$inferInsert)[] = [];
  const seenEnrollKeys = new Set<string>();

  for (const item of pendingEnrollments) {
    const clsRow = classByKey.get(item.classKey);
    if (!clsRow || clsRow.id <= 0) continue;
    for (const stu of item.students) {
      const fullName = `${stu.firstName || ""} ${stu.lastName || ""}`.replace(/\s+/g, " ").trim();
      const extId = stu.mycytPersonId ? String(stu.mycytPersonId) : null;
      const email = (stu.email || "").trim().toLowerCase();
      const matched =
        (extId ? personByExtId.get(extId) : undefined) ||
        (email && fullName ? personByNameEmail.get(`${norm(fullName)}|${email}`) : undefined) ||
        (fullName ? personByNormName.get(norm(fullName)) : undefined);
      if (!matched) continue;
      const dedupeKey = `${clsRow.id}|${matched.id}`;
      if (seenEnrollKeys.has(dedupeKey)) continue;
      seenEnrollKeys.add(dedupeKey);
      batchEnrollments.push({
        organizationId: org.id,
        classId: clsRow.id,
        studentId: matched.id,
        status: "enrolled",
      });
      enrollmentsQueued++;
    }
  }

  if (batchEnrollments.length > 0 && !DRY_RUN) {
    for (let i = 0; i < batchEnrollments.length; i += 300) {
      await db
        .insert(schema.classEnrollments)
        .values(batchEnrollments.slice(i, i + 300))
        .onConflictDoNothing();
    }
  }

  console.log(
    `[4/5] Academy: +${stats.sessionsCreated} sessions, +${stats.classesCreated} classes, ${classesUpdatedLoc} church locations backfilled, ${classesUpdatedDay} weekdays backfilled, ${enrollmentsQueued} student enrollments synced`
  );
  console.log(`\n================================================`);
  console.log(DRY_RUN ? `✓ DRY RUN COMPLETE (no database writes made)` : `✓ LIVE IMPORT COMPLETE!`);
  console.log(`================================================\n`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
