import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "../db";

/**
 * Re-parents all child records from `sourceProdId` to `targetProdId` and deletes `sourceProdId`.
 * Safe & idempotent: skips if either production no longer exists.
 */
async function mergeProduction(orgId: number, sourceProdId: number, targetProdId: number) {
  const db = getDb();
  const [src] = await db
    .select()
    .from(schema.productions)
    .where(and(eq(schema.productions.organizationId, orgId), eq(schema.productions.id, sourceProdId)))
    .limit(1);
  const [dst] = await db
    .select()
    .from(schema.productions)
    .where(and(eq(schema.productions.organizationId, orgId), eq(schema.productions.id, targetProdId)))
    .limit(1);

  if (!src || !dst) {
    console.log(`  [skip merge] ${sourceProdId} -> ${targetProdId} (already merged or missing)`);
    return;
  }

  console.log(`  [merge] #${src.id} "${src.title}" -> #${dst.id} "${dst.title}"`);

  // Re-parent all tables that reference production_id
  const tables = [
    "assignments",
    "show_team",
    "auditions",
    "audition_slots",
    "audition_judge_scores",
    "scenes",
    "events",
    "performances",
    "tickets",
    "promo_codes",
    "signatures",
    "student_bios",
    "committee_assignments",
    "chair_reports",
    "rehearsal_reports",
    "conflicts",
    "costume_measurements",
  ];

  for (const tbl of tables) {
    try {
      await db.execute(
        sql.raw(
          `UPDATE "${tbl}" SET production_id = ${targetProdId} WHERE organization_id = ${orgId} AND production_id = ${sourceProdId}`
        )
      );
    } catch {
      // Table may not have that column or no rows
    }
  }

  // Also garment_inventory.assigned_production_id
  try {
    await db.execute(
      sql.raw(
        `UPDATE "garment_inventory" SET assigned_production_id = ${targetProdId} WHERE organization_id = ${orgId} AND assigned_production_id = ${sourceProdId}`
      )
    );
  } catch {
    // ignore
  }

  // Delete now-empty duplicate production
  await db
    .delete(schema.productions)
    .where(and(eq(schema.productions.organizationId, orgId), eq(schema.productions.id, sourceProdId)));
}

async function main() {
  const db = getDb();
  const [org] = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.slug, "cytfred"))
    .limit(1);

  if (!org) {
    throw new Error("Organization 'cytfred' not found.");
  }

  console.log(`Cleaning up CYT Fredericksburg (org #${org.id})...\n`);

  // ---------------------------------------------------------------------------
  // 1. POPULATE SEASON DATES & STATUSES (+ ensure 2005-2006 exists)
  // ---------------------------------------------------------------------------
  const existingSeasons = await db
    .select()
    .from(schema.seasons)
    .where(eq(schema.seasons.organizationId, org.id));

  const seasonByName = new Map<string, number>();
  for (const s of existingSeasons) {
    seasonByName.set(s.name, s.id);
  }

  if (!seasonByName.has("2005-2006")) {
    const [inserted] = await db
      .insert(schema.seasons)
      .values({
        organizationId: org.id,
        name: "2005-2006",
        startDate: "2005-08-01",
        endDate: "2006-07-31",
        status: "Archived",
      })
      .returning();
    seasonByName.set("2005-2006", inserted.id);
    console.log("  [season+] Added 2005-2006");
  }

  for (const [name, id] of seasonByName.entries()) {
    const match = name.match(/^(\d{4})-(\d{4})$/);
    if (!match) continue;
    const startYear = Number(match[1]);
    const endYear = Number(match[2]);
    const status = name === "2026-2027" ? "Active" : "Archived";
    await db
      .update(schema.seasons)
      .set({
        startDate: `${startYear}-08-01`,
        endDate: `${endYear}-07-31`,
        status,
        updatedAt: new Date(),
      })
      .where(eq(schema.seasons.id, id));
  }
  console.log(`Updated dates & statuses on ${seasonByName.size} seasons.\n`);

  // ---------------------------------------------------------------------------
  // 2. MERGE DUPLICATE HISTORICAL PRODUCTIONS (preserving all cast/crew/scenes)
  // ---------------------------------------------------------------------------
  console.log("Merging confirmed duplicate shows...");
  await mergeProduction(org.id, 121, 7); // Miracle 34th St (2011) -> Miracle on 34th Street
  await mergeProduction(org.id, 9, 61); // Dr. Doolittle -> Doctor Doolittle
  await mergeProduction(org.id, 124, 11); // Bye-Bye-Birdie (2013) -> Bye Bye, Birdie
  await mergeProduction(org.id, 120, 60); // A Little Princess (2011) -> The Little Princess (not Lippa's)

  // ---------------------------------------------------------------------------
  // 3. LINK THE REMAINING 11 UNLINKED 2007–2015 SHOWS TO THEIR EXACT SEASONS
  // ---------------------------------------------------------------------------
  console.log("\nLinking unlinked 2007–2015 shows...");
  const unlinkedFixes: Array<{
    id: number;
    title: string;
    season: string;
    sessionLabel: "Fall" | "Winter" | "Spring" | "Summer";
    type: string;
  }> = [
    { id: 113, title: "The Jungle Book", season: "2006-2007", sessionLabel: "Spring", type: "Main Stage" },
    { id: 114, title: "Annie", season: "2007-2008", sessionLabel: "Fall", type: "Main Stage" },
    { id: 115, title: "The Wizard of Oz", season: "2007-2008", sessionLabel: "Winter", type: "Main Stage" },
    { id: 116, title: "Seussical the Musical", season: "2008-2009", sessionLabel: "Winter", type: "Main Stage" },
    { id: 117, title: "Les Misérables", season: "2008-2009", sessionLabel: "Summer", type: "Master Camp" },
    { id: 118, title: "Aladdin Jr.", season: "2009-2010", sessionLabel: "Spring", type: "Main Stage" },
    { id: 119, title: "A Christmas Carol", season: "2010-2011", sessionLabel: "Fall", type: "Main Stage" },
    { id: 122, title: "Beauty and the Beast", season: "2012-2013", sessionLabel: "Fall", type: "Main Stage" },
    { id: 123, title: "The Wizard of Oz", season: "2012-2013", sessionLabel: "Winter", type: "Main Stage" },
    { id: 125, title: "Seussical the Musical", season: "2014-2015", sessionLabel: "Winter", type: "Main Stage" },
    { id: 126, title: "Mary Poppins", season: "2015-2016", sessionLabel: "Fall", type: "Main Stage" },
  ];

  for (const fix of unlinkedFixes) {
    const seasonId = seasonByName.get(fix.season);
    if (!seasonId) continue;
    await db
      .update(schema.productions)
      .set({
        title: fix.title,
        seasonId,
        sessionLabel: fix.sessionLabel,
        status: "Archived",
        type: fix.type,
        location: "Fredericksburg",
        updatedAt: new Date(),
      })
      .where(and(eq(schema.productions.organizationId, org.id), eq(schema.productions.id, fix.id)));
    console.log(`  [linked] #${fix.id} -> ${fix.season} ${fix.sessionLabel} - ${fix.title}`);
  }

  // ---------------------------------------------------------------------------
  // 4. RE-PARENT TEMPLATE SCENES FROM Production 146–156 & DELETE ALL Production 146–186
  // ---------------------------------------------------------------------------
  console.log("\nCleaning up Production 146–186 scraper placeholders...");
  const templateSceneTargets: Array<{ sourceId: number; targetId: number }> = [
    { sourceId: 73, targetId: 37 }, // 101 Dalmatians
    { sourceId: 75, targetId: 113 }, // Jungle Book
    { sourceId: 77, targetId: 4 }, // Alice in Wonderland Jr.
    { sourceId: 78, targetId: 53 }, // Footloose!
    { sourceId: 80, targetId: 1 }, // Into The Woods
    { sourceId: 81, targetId: 11 }, // Bye Bye, Birdie
    { sourceId: 82, targetId: 6 }, // The Sound of Music
  ];

  for (const { sourceId, targetId } of templateSceneTargets) {
    const existingTargetScenes = await db
      .select({ id: schema.scenes.id })
      .from(schema.scenes)
      .where(and(eq(schema.scenes.organizationId, org.id), eq(schema.scenes.productionId, targetId)))
      .limit(1);

    if (existingTargetScenes.length === 0) {
      await db
        .update(schema.scenes)
        .set({ productionId: targetId })
        .where(and(eq(schema.scenes.organizationId, org.id), eq(schema.scenes.productionId, sourceId)));
      console.log(`  [scenes moved] #${sourceId} -> #${targetId}`);
    }
  }

  // Delete all placeholder rows titled "Production 1xx" with season_id IS NULL
  const placeholders = await db
    .select({ id: schema.productions.id, title: schema.productions.title })
    .from(schema.productions)
    .where(
      and(
        eq(schema.productions.organizationId, org.id),
        sql`${schema.productions.title} ~ '^Production [0-9]+$'`
      )
    );

  if (placeholders.length > 0) {
    const ids = placeholders.map((p) => p.id);
    await db
      .delete(schema.productions)
      .where(and(eq(schema.productions.organizationId, org.id), inArray(schema.productions.id, ids)));
    console.log(`  [deleted] ${placeholders.length} empty "Production 1xx" placeholder rows.`);
  }

  // ---------------------------------------------------------------------------
  // 5. ARCHIVE 2025–2026 INTO THE WOODS & UPSERT 2026–2027 + MISSING OURSTORY SHOWS
  // ---------------------------------------------------------------------------
  await db
    .update(schema.productions)
    .set({ status: "Archived", updatedAt: new Date() })
    .where(and(eq(schema.productions.organizationId, org.id), eq(schema.productions.id, 1)));

  const venueRows = await db
    .select({ id: schema.venues.id, name: schema.venues.name })
    .from(schema.venues)
    .where(eq(schema.venues.organizationId, org.id));
  const venueIdByName = new Map(venueRows.map((v) => [v.name.toLowerCase(), v.id]));

  const currentProds = await db
    .select({
      id: schema.productions.id,
      title: schema.productions.title,
      seasonId: schema.productions.seasonId,
      sessionLabel: schema.productions.sessionLabel,
    })
    .from(schema.productions)
    .where(eq(schema.productions.organizationId, org.id));

  const hasShow = (seasonName: string, sessionLabel: string, titlePrefix: string) => {
    const sid = seasonByName.get(seasonName);
    const needle = titlePrefix.toLowerCase();
    return currentProds.some(
      (p) =>
        p.seasonId === sid &&
        (p.sessionLabel || "").toLowerCase() === sessionLabel.toLowerCase() &&
        p.title.toLowerCase().includes(needle)
    );
  };

  const missingShows: Array<{
    title: string;
    season: string;
    sessionLabel: "Fall" | "Winter" | "Spring" | "Summer";
    status: "Active" | "Upcoming" | "Archived";
    type: string;
    venueName?: string;
    datesNote?: string;
  }> = [
    // Missing historical shows from cytfredericksburg.org/ourstory/
    { title: "You're A Good Man, Charlie Brown", season: "2005-2006", sessionLabel: "Spring", status: "Archived", type: "Main Stage" },
    { title: "Willy Wonka Jr.", season: "2008-2009", sessionLabel: "Fall", status: "Archived", type: "Main Stage" },
    { title: "The Little Mermaid", season: "2008-2009", sessionLabel: "Spring", status: "Archived", type: "Main Stage" },
    { title: "The Music Man", season: "2009-2010", sessionLabel: "Winter", status: "Archived", type: "Main Stage" },
    { title: "Mulan Jr.", season: "2010-2011", sessionLabel: "Spring", status: "Archived", type: "Main Stage" },
    { title: "Annie", season: "2013-2014", sessionLabel: "Fall", status: "Archived", type: "Main Stage" },
    { title: "The Little Mermaid Jr.", season: "2013-2014", sessionLabel: "Spring", status: "Archived", type: "Main Stage" },
    { title: "A Christmas Carol", season: "2014-2015", sessionLabel: "Fall", status: "Archived", type: "Main Stage" },
    { title: "White Christmas", season: "2016-2017", sessionLabel: "Fall", status: "Archived", type: "Main Stage" },
    { title: "Godspell", season: "2017-2018", sessionLabel: "Winter", status: "Archived", type: "Main Stage" },
    { title: "Moana Jr. (Canceled due to COVID)", season: "2019-2020", sessionLabel: "Spring", status: "Archived", type: "Main Stage" },

    // 2026–2027 20th Anniversary Season from cytfredericksburg.org/shows/ & /ourstory/
    {
      title: "Singin' in the Rain",
      season: "2026-2027",
      sessionLabel: "Fall",
      status: "Archived",
      type: "Main Stage",
    },
    {
      title: "A Charlie Brown Christmas",
      season: "2026-2027",
      sessionLabel: "Fall",
      status: "Active",
      type: "Lite",
      venueName: "Kingdom Baptist Church",
      datesNote: "Nov 27 – Nov 28, 2026 (3 Performances)",
    },
    {
      title: "Frozen",
      season: "2026-2027",
      sessionLabel: "Winter",
      status: "Upcoming",
      type: "Main Stage",
      venueName: "Location TBD",
      datesNote: "Feb 26 – Mar 7, 2027 (8 Performances)",
    },
    {
      title: "Madagascar — A Musical Adventure KIDS",
      season: "2026-2027",
      sessionLabel: "Spring",
      status: "Upcoming",
      type: "Lite",
      venueName: "Kingdom Baptist Church",
      datesNote: "May 21 – May 22, 2027",
    },
    {
      title: "Tuck Everlasting",
      season: "2026-2027",
      sessionLabel: "Spring",
      status: "Upcoming",
      type: "Main Stage",
      venueName: "King George High School",
      datesNote: "Jun 4 – Jun 13, 2027 (8 Performances)",
    },
  ];

  console.log("\nBackfilling missing official shows & 2026–2027 season...");
  let addedCount = 0;
  for (const show of missingShows) {
    const shortKey = show.title.split("(")[0].split("—")[0].trim().slice(0, 14);
    if (hasShow(show.season, show.sessionLabel, shortKey)) continue;
    const seasonId = seasonByName.get(show.season);
    if (!seasonId) continue;
    const venueId = show.venueName
      ? venueIdByName.get(show.venueName.toLowerCase()) ?? null
      : null;

    await db.insert(schema.productions).values({
      organizationId: org.id,
      title: show.title,
      seasonId,
      sessionLabel: show.sessionLabel,
      status: show.status,
      type: show.type,
      venueId,
      location: "Fredericksburg",
      legacyPerformancesJson: show.datesNote
        ? JSON.stringify({ scheduleNote: show.datesNote })
        : null,
    });
    addedCount++;
    console.log(`  [added] ${show.season} ${show.sessionLabel} - ${show.title} (${show.status})`);
  }

  // Final summary
  const finalCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.productions)
    .where(eq(schema.productions.organizationId, org.id));

  const nullSeasonCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.productions)
    .where(and(eq(schema.productions.organizationId, org.id), sql`${schema.productions.seasonId} IS NULL`));

  console.log(`\nDone! Added ${addedCount} shows. Total cytfred productions: ${finalCount[0].count} (unlinked: ${nullSeasonCount[0].count}).`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
