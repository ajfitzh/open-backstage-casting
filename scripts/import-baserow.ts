// scripts/import-baserow.ts
// Repeatable, idempotent, batch-optimized Baserow -> Neon PostgreSQL importer.
// Usage:
//   npm run db:import -- --tenant=cytfred --dry-run
//   npm run db:import -- --tenant=cytfred

import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "../db";
import { DB } from "../app/lib/schema";
import {
  extractAllLinkIds,
  extractBool,
  extractFileUrl,
  extractFileUrls,
  extractInt,
  extractMultiSelect,
  extractNumber,
  extractSelect,
  extractText,
  mapLinkedId,
  mapLinkedIds,
  normalizeEmail,
  safeParseJson,
} from "./baserow-import-helpers";

const BASE_URL = (process.env.NEXT_PUBLIC_BASEROW_URL || "https://api.baserow.io").replace(
  /\/$/,
  ""
);
const API_TOKEN = process.env.BASEROW_API_TOKEN || process.env.NEXT_PUBLIC_BASEROW_TOKEN;
const MASTER_REGISTRY_TABLE_ID = process.env.NEXT_PUBLIC_MASTER_REGISTRY_TABLE_ID;
const BATCH_SIZE = 200;

interface CliArgs {
  tenant: string;
  dryRun: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  let tenant = process.env.DEFAULT_TENANT_SLUG || "cytfred";
  let dryRun = false;

  for (const arg of args) {
    if (arg.startsWith("--tenant=")) {
      tenant = arg.slice("--tenant=".length).trim().toLowerCase();
    } else if (arg === "--dry-run") {
      dryRun = true;
    }
  }

  return { tenant, dryRun };
}

function chunkArray<T>(items: T[], size = BATCH_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function fetchAllBaserowRows(
  tableId: string | number | null | undefined,
  userFieldNames = false
): Promise<Record<string, unknown>[]> {
  if (!tableId || String(tableId) === "0") return [];
  if (!API_TOKEN) throw new Error("Missing BASEROW_API_TOKEN in .env.local");

  const rows: Record<string, unknown>[] = [];
  let page = 1;
  const maxPages = 50;

  while (page <= maxPages) {
    const query = new URLSearchParams({ size: "200", page: String(page) });
    if (userFieldNames) query.set("user_field_names", "true");
    const url = `${BASE_URL}/api/database/rows/table/${tableId}/?${query.toString()}`;

    const res = await fetch(url, {
      headers: { Authorization: `Token ${API_TOKEN}` },
    });

    if (res.status === 404) break;
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Baserow error [${res.status}] on table ${tableId}: ${body.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      results?: Record<string, unknown>[];
      next?: string | null;
    };

    if (Array.isArray(data.results)) {
      rows.push(...data.results);
    }
    if (!data.next) break;
    page += 1;
  }

  return rows;
}

async function main() {
  const startedAt = Date.now();
  const { tenant, dryRun } = parseArgs();

  if (!MASTER_REGISTRY_TABLE_ID || !API_TOKEN) {
    throw new Error(
      "Missing NEXT_PUBLIC_MASTER_REGISTRY_TABLE_ID or BASEROW_API_TOKEN in environment."
    );
  }

  console.log(`\n🎭 Open Backstage Baserow → Postgres Importer`);
  console.log(`   Tenant:  ${tenant}`);
  console.log(`   Mode:    ${dryRun ? "DRY RUN (read-only audit)" : "LIVE BATCH UPSERT into PostgreSQL"}`);
  console.log(`   Source:  ${BASE_URL}\n`);

  const registryRows = await fetchAllBaserowRows(MASTER_REGISTRY_TABLE_ID, true);
  const tenantRow = registryRows.find(
    (r) => String(r.Slug ?? r.SLUG ?? "").trim().toLowerCase() === tenant
  );

  if (!tenantRow) {
    throw new Error(`Tenant "${tenant}" not found in Master Registry table ${MASTER_REGISTRY_TABLE_ID}.`);
  }

  const orgName =
    extractText(tenantRow.Name ?? tenantRow.NAME) || tenant.toUpperCase();

  const tableIds: Record<string, string | number | null | undefined> = {
    FAMILIES: extractText(tenantRow.FAMILIES),
    PEOPLE: extractText(tenantRow.PEOPLE),
    MASTER_SHOW_DB: extractText(tenantRow.MASTER_SHOW_DB),
    SEASONS: extractText(tenantRow.SEASONS) ?? (tenant === "cytfred" ? DB.SEASONS.ID : null),
    SESSIONS: extractText(tenantRow.SESSIONS),
    VENUES: extractText(tenantRow.VENUES),
    SPACES: extractText(tenantRow.SPACES),
    RENTAL_RATES: extractText(tenantRow.RATES ?? tenantRow.RENTAL_RATES),
    SEATS: extractText(tenantRow.SEATS),
    STAFF_POSITIONS: extractText(tenantRow.ROLES_POSITIONS),
    PRODUCTIONS: extractText(tenantRow.PRODUCTIONS),
    PERFORMANCES: extractText(tenantRow.PERFORMANCES),
    SHOW_TEAM: extractText(tenantRow.TEAM_ASSIGNMENTS ?? tenantRow.SHOW_TEAM),
    STAFF_INTEREST: extractText(tenantRow.STAFF_INTEREST),
    BLUEPRINT_ROLES: extractText(tenantRow.ROLES ?? tenantRow.BLUEPRINT_ROLES),
    AUDITION_SLOTS: extractText(tenantRow.AUDITION_SLOTS) ?? "772",
    AUDITIONS: extractText(tenantRow.AUDITIONS),
    ASSIGNMENTS: extractText(tenantRow.ASSIGNMENTS),
    SIGNATURES: extractText(tenantRow.SIGNATURES),
    STUDENT_BIO: extractText(tenantRow.STUDENT_BIO),
    EVENTS: extractText(tenantRow.EVENTS),
    SCENES: extractText(tenantRow.SCENES),
    SCENE_ASSIGNMENTS: extractText(tenantRow.SCENE_ASSIGNMENTS),
    SCHEDULE_SLOTS: extractText(tenantRow.SLOTS ?? tenantRow.SCHEDULE_SLOTS),
    ATTENDANCE: extractText(tenantRow.ATTENDANCE),
    CONFLICTS: extractText(tenantRow.CONFLICTS),
    ASSETS: extractText(tenantRow.RESOURCES ?? tenantRow.ASSETS),
    COMMITTEE_PREFS: extractText(tenantRow.COMMITTEE_PREFS),
    COMMITTEE_REPORTS: extractText(tenantRow.COMMITTEE_REPORTS),
    MEASUREMENTS: extractText(tenantRow.MEASUREMENTS),
    GARMENT_INVENTORY: extractText(tenantRow.GARMENT_INVENTORY),
    CLASSES: extractText(tenantRow.CLASSES),
  };

  console.log(`📥 Fetching Baserow tables for "${orgName}" (${tenant})...`);

  const entries = Object.entries(tableIds);
  const fetchedEntries = await Promise.all(
    entries.map(async ([key, id]) => {
      const rows = await fetchAllBaserowRows(id);
      return [key, rows] as const;
    })
  );
  const raw: Record<string, Record<string, unknown>[]> = Object.fromEntries(fetchedEntries);

  const summary = entries.map(([key, id]) => ({
    Table: key,
    BaserowTableId: id ?? "-",
    Rows: raw[key]?.length ?? 0,
  }));
  console.table(summary);

  const totalRows = summary.reduce((acc, s) => acc + s.Rows, 0);
  console.log(`Total Baserow rows discovered: ${totalRows}`);

  if (dryRun) {
    console.log(`\n✅ Dry run complete. No changes were written to PostgreSQL.`);
    return;
  }

  const db = getDb();

  // 1. Upsert Organization
  const [org] = await db
    .insert(schema.organizations)
    .values({
      slug: tenant,
      name: orgName,
      baserowRegistryId: Number(tenantRow.id) || null,
      isHidden: ["e2e", "sandbox", "test"].includes(tenant),
    })
    .onConflictDoUpdate({
      target: schema.organizations.slug,
      set: {
        name: orgName,
        baserowRegistryId: Number(tenantRow.id) || null,
        updatedAt: new Date(),
      },
    })
    .returning();

  const orgId = org.id;
  console.log(`\n🏢 Organization ready: #${orgId} (${org.slug} — ${org.name})`);

  const familyMap = new Map<number, number>();
  const personMap = new Map<number, number>();
  const masterShowMap = new Map<number, number>();
  const seasonMap = new Map<number, number>();
  const sessionMap = new Map<number, number>();
  const venueMap = new Map<number, number>();
  const spaceMap = new Map<number, number>();
  const positionMap = new Map<number, number>();
  const prodMap = new Map<number, number>();
  const roleMap = new Map<number, number>();
  const slotMap = new Map<number, number>();
  const auditionMap = new Map<number, number>();
  const eventMap = new Map<number, number>();
  const sceneMap = new Map<number, number>();
  const classMap = new Map<number, number>();

  // 2. Families (batched)
  for (const chunk of chunkArray(raw.FAMILIES)) {
    const F = DB.FAMILIES.FIELDS;
    const rows = await db
      .insert(schema.families)
      .values(
        chunk.map((r) => ({
          organizationId: orgId,
          baserowId: Number(r.id),
          name: extractText(r[F.FAMILY]),
          email: normalizeEmail(r[F.EMAIL]),
          externalFamilyId: extractText(r[F.CYT_NATIONAL_ID]),
        }))
      )
      .onConflictDoUpdate({
        target: [schema.families.organizationId, schema.families.baserowId],
        set: {
          name: sql`excluded.name`,
          email: sql`excluded.email`,
          externalFamilyId: sql`excluded.external_family_id`,
          updatedAt: new Date(),
        },
      })
      .returning({ id: schema.families.id, baserowId: schema.families.baserowId });
    for (const row of rows) if (row.baserowId !== null) familyMap.set(row.baserowId, row.id);
  }
  console.log(`   ✓ families: ${familyMap.size}`);

  // 3. People (batched pass 1)
  for (const chunk of chunkArray(raw.PEOPLE)) {
    const F = DB.PEOPLE.FIELDS;
    const rows = await db
      .insert(schema.people)
      .values(
        chunk.map((r) => {
          const firstName = extractText(r[F.FIRST_NAME]) ?? "";
          const lastName = extractText(r[F.LAST_NAME]) ?? "";
          const fullName =
            extractText(r[F.FULL_NAME]) ?? `${firstName} ${lastName}`.trim() ?? "Unknown";
          return {
            organizationId: orgId,
            baserowId: Number(r.id),
            familyId: mapLinkedId(r[F.FAMILIES], familyMap),
            firstName,
            lastName,
            fullName,
            email: normalizeEmail(r[F.CYT_ACCOUNT_PERSONAL_EMAIL]),
            secondaryEmail: normalizeEmail(r[F.CYT_NATIONAL_INDIVIDUAL_EMAIL]),
            familyEmail: normalizeEmail(r[F.CYT_NATIONAL_FAMILY_EMAIL]),
            phone: extractText(r[F.PHONE_NUMBER]),
            dateOfBirth: extractText(r[F.DATE_OF_BIRTH]),
            gender: extractSelect(r[F.GENDER]),
            headshotUrl: extractFileUrl(r[F.HEADSHOT]),
            heightInches: extractInt(r[F.HEIGHT_TOTAL_INCHES]),
            roles: extractMultiSelect(r[F.STATUS]),
            passwordHash: extractText(r[F.APP_PASSWORD]),
            attendanceStatus: extractSelect(r[F.ATTENDANCE_STATUS]),
            editedBio: extractText(r[F.EDITED_BIO_FOR_PROGRAM]),
            address: extractText(r[F.ADDRESS]),
            secondaryAddress: extractText(r[F.SECONDARY_ADDRESS]),
            city: extractText(r[F.CITY]),
            state: extractText(r[F.STATE]),
            zipcode: extractText(r[F.ZIPCODE]),
            tylenolApproval: extractBool(r[F.TYLENOL_APPROVAL]),
            ibuprofenApproval: extractBool(r[F.IBUPROFEN_APPROVAL]),
            medicalNotes: extractText(r[F.MEDICAL_NOTES]),
            medicalProvider: extractText(r[F.MEDICAL_PROVIDER]),
            medicalInsurance: extractText(r[F.MEDICAL_INSURANCE]),
            medicalPhone: extractText(r[F.MEDICAL_PHONE]),
            emergencyContactName: extractText(r[F.EMERGENCY_CONTACT_NAME]),
            emergencyContactPhone: extractText(r[F.EMERGENCY_CONTACT_PHONE]),
            school: extractText(r[F.SCHOOL]),
            placeOfWorship: extractText(r[F.PLACE_OF_WORSHIP]),
            friendRequest: extractText(r[F.FRIEND_REQUEST]),
            tShirtSize: extractText(r[F.T_SHIRT_SIZE]),
            photoRelease: extractBool(r[F.PHOTO_RELEASE]),
            authorizedPickup: safeParseJson(r[F.AUTHORIZED_PICKUP_JSON], []),
            externalUserId: extractText(r[F.CYT_NATIONAL_USER_ID]),
            externalFamilyAccount: extractText(r[F.CYT_NATIONAL_FAMILY_ACCOUNT]),
          };
        })
      )
      .onConflictDoUpdate({
        target: [schema.people.organizationId, schema.people.baserowId],
        set: {
          familyId: sql`excluded.family_id`,
          firstName: sql`excluded.first_name`,
          lastName: sql`excluded.last_name`,
          fullName: sql`excluded.full_name`,
          email: sql`excluded.email`,
          secondaryEmail: sql`excluded.secondary_email`,
          familyEmail: sql`excluded.family_email`,
          phone: sql`excluded.phone`,
          dateOfBirth: sql`excluded.date_of_birth`,
          gender: sql`excluded.gender`,
          headshotUrl: sql`excluded.headshot_url`,
          heightInches: sql`excluded.height_inches`,
          roles: sql`excluded.roles`,
          passwordHash: sql`excluded.password_hash`,
          attendanceStatus: sql`excluded.attendance_status`,
          editedBio: sql`excluded.edited_bio`,
          address: sql`excluded.address`,
          city: sql`excluded.city`,
          state: sql`excluded.state`,
          zipcode: sql`excluded.zipcode`,
          medicalNotes: sql`excluded.medical_notes`,
          emergencyContactName: sql`excluded.emergency_contact_name`,
          emergencyContactPhone: sql`excluded.emergency_contact_phone`,
          photoRelease: sql`excluded.photo_release`,
          authorizedPickup: sql`excluded.authorized_pickup`,
          updatedAt: new Date(),
        },
      })
      .returning({ id: schema.people.id, baserowId: schema.people.baserowId });
    for (const row of rows) if (row.baserowId !== null) personMap.set(row.baserowId, row.id);
  }

  // Pass 2: link parent_1/2/3 references in parallel batches of 25
  const parentUpdates = raw.PEOPLE.map((r) => {
    const F = DB.PEOPLE.FIELDS;
    const pgId = personMap.get(Number(r.id));
    if (!pgId) return null;
    const parent1Id = mapLinkedId(r[F.PARENT_GUARDIAN_1], personMap);
    const parent2Id = mapLinkedId(r[F.PARENT_GUARDIAN_2], personMap);
    const parent3Id = mapLinkedId(r[F.PARENT_GUARDIAN_3], personMap);
    if (!parent1Id && !parent2Id && !parent3Id) return null;
    return { pgId, parent1Id, parent2Id, parent3Id };
  }).filter((u): u is NonNullable<typeof u> => u !== null);

  for (const chunk of chunkArray(parentUpdates, 25)) {
    await Promise.all(
      chunk.map((u) =>
        db
          .update(schema.people)
          .set({ parent1Id: u.parent1Id, parent2Id: u.parent2Id, parent3Id: u.parent3Id })
          .where(eq(schema.people.id, u.pgId))
      )
    );
  }
  console.log(`   ✓ people: ${personMap.size} (${parentUpdates.length} parent links)`);

  // 4. Master Shows
  for (const chunk of chunkArray(raw.MASTER_SHOW_DB)) {
    const F = DB.MASTER_SHOW_DB.FIELDS;
    const rows = await db
      .insert(schema.masterShows)
      .values(
        chunk.map((r) => ({
          organizationId: orgId,
          baserowId: Number(r.id),
          title: extractText(r[F.SHOW_TITLE] ?? r[F.COMPLETE_TITLE]) ?? "Untitled Show",
          licensor: extractText(r[F.LICENSOR]),
          minimumCast: extractInt(r[F.MINIMUM_CAST]),
          maximumCast: extractInt(r[F.MAXIMUM_CAST]),
          vocalDifficulty: extractInt(r[F.VOCAL_DIFFICULTY]),
          royaltyEstimate: extractNumber(r[F.ROYALTY_ESTIMATE]),
          brandStrength: extractNumber(r[F.BRAND_STRENGTH]),
          staffingTier: extractSelect(r[F.STAFFING_TIER]),
          contentTags: extractMultiSelect(r[F.CONTENT_TAGS]),
        }))
      )
      .onConflictDoUpdate({
        target: [schema.masterShows.organizationId, schema.masterShows.baserowId],
        set: {
          title: sql`excluded.title`,
          licensor: sql`excluded.licensor`,
          minimumCast: sql`excluded.minimum_cast`,
          maximumCast: sql`excluded.maximum_cast`,
          vocalDifficulty: sql`excluded.vocal_difficulty`,
          royaltyEstimate: sql`excluded.royalty_estimate`,
          brandStrength: sql`excluded.brand_strength`,
          staffingTier: sql`excluded.staffing_tier`,
          contentTags: sql`excluded.content_tags`,
          updatedAt: new Date(),
        },
      })
      .returning({ id: schema.masterShows.id, baserowId: schema.masterShows.baserowId });
    for (const row of rows) if (row.baserowId !== null) masterShowMap.set(row.baserowId, row.id);
  }
  console.log(`   ✓ master_shows: ${masterShowMap.size}`);

  // 5. Seasons & Sessions
  for (const chunk of chunkArray(raw.SEASONS)) {
    const F = DB.SEASONS.FIELDS;
    const rows = await db
      .insert(schema.seasons)
      .values(
        chunk.map((r) => ({
          organizationId: orgId,
          baserowId: Number(r.id),
          name: extractText(r[F.NAME]) ?? `Season ${r.id}`,
          startDate: extractText(r[F.START_DATE]),
          endDate: extractText(r[F.END_DATE]),
          status: extractSelect(r[F.STATUS]),
        }))
      )
      .onConflictDoUpdate({
        target: [schema.seasons.organizationId, schema.seasons.baserowId],
        set: {
          name: sql`excluded.name`,
          startDate: sql`excluded.start_date`,
          endDate: sql`excluded.end_date`,
          status: sql`excluded.status`,
          updatedAt: new Date(),
        },
      })
      .returning({ id: schema.seasons.id, baserowId: schema.seasons.baserowId });
    for (const row of rows) if (row.baserowId !== null) seasonMap.set(row.baserowId, row.id);
  }

  for (const chunk of chunkArray(raw.SESSIONS)) {
    const F = DB.SESSIONS.FIELDS;
    const rows = await db
      .insert(schema.sessions)
      .values(
        chunk.map((r) => ({
          organizationId: orgId,
          baserowId: Number(r.id),
          seasonId: mapLinkedId(r[F.SEASON], seasonMap),
          name: extractText(r[F.SESSION_NAME]) ?? `Session ${r.id}`,
          startDate: extractText(r[F.START_DATE]),
          endDate: extractText(r[F.END_DATE]),
          isActive: extractBool(r[F.IS_ACTIVE]),
        }))
      )
      .onConflictDoUpdate({
        target: [schema.sessions.organizationId, schema.sessions.baserowId],
        set: {
          seasonId: sql`excluded.season_id`,
          name: sql`excluded.name`,
          startDate: sql`excluded.start_date`,
          endDate: sql`excluded.end_date`,
          isActive: sql`excluded.is_active`,
          updatedAt: new Date(),
        },
      })
      .returning({ id: schema.sessions.id, baserowId: schema.sessions.baserowId });
    for (const row of rows) if (row.baserowId !== null) sessionMap.set(row.baserowId, row.id);
  }
  console.log(`   ✓ seasons: ${seasonMap.size}, sessions: ${sessionMap.size}`);

  // 6. Venues, Spaces, Rental Rates, Seats, Staff Positions
  for (const chunk of chunkArray(raw.VENUES)) {
    const F = DB.VENUES.FIELDS;
    const rows = await db
      .insert(schema.venues)
      .values(
        chunk.map((r) => ({
          organizationId: orgId,
          baserowId: Number(r.id),
          name: extractText(r[F.VENUE_NAME]) ?? `Venue ${r.id}`,
          marketingName: extractText(r[F.PUBLIC_NAME_MARKETING]),
          chapters: extractText(r[F.CHAPTERS]),
          seatingCapacity: extractInt(r[F.SEATING_CAPACITY]),
          locationNotes: extractText(r[F.LOCATION_NOTES]),
          address: extractText(r[F.ADDRESS]),
          seatingChartUrl: extractFileUrl(r[F.SEATING_CHART]),
          type: extractSelect(r[F.TYPE]),
          contactName: extractText(r[F.CONTACT_NAME]),
        }))
      )
      .onConflictDoUpdate({
        target: [schema.venues.organizationId, schema.venues.baserowId],
        set: {
          name: sql`excluded.name`,
          marketingName: sql`excluded.marketing_name`,
          seatingCapacity: sql`excluded.seating_capacity`,
          address: sql`excluded.address`,
          updatedAt: new Date(),
        },
      })
      .returning({ id: schema.venues.id, baserowId: schema.venues.baserowId });
    for (const row of rows) if (row.baserowId !== null) venueMap.set(row.baserowId, row.id);
  }

  for (const chunk of chunkArray(raw.SPACES)) {
    const F = DB.SPACES.FIELDS;
    const rows = await db
      .insert(schema.spaces)
      .values(
        chunk.map((r) => ({
          organizationId: orgId,
          baserowId: Number(r.id),
          venueId: mapLinkedId(r[F.VENUE], venueMap),
          roomName: extractText(r[F.ROOM_NAME] ?? r[F.FULL_ROOM_NAME]) ?? `Room ${r.id}`,
          capacity: extractInt(r[F.CAPACITY]),
          floorType: extractSelect(r[F.FLOOR_TYPE]),
          squareFootage: extractInt(r[F.SQUARE_FOOTAGE]),
        }))
      )
      .onConflictDoUpdate({
        target: [schema.spaces.organizationId, schema.spaces.baserowId],
        set: {
          venueId: sql`excluded.venue_id`,
          roomName: sql`excluded.room_name`,
          capacity: sql`excluded.capacity`,
          updatedAt: new Date(),
        },
      })
      .returning({ id: schema.spaces.id, baserowId: schema.spaces.baserowId });
    for (const row of rows) if (row.baserowId !== null) spaceMap.set(row.baserowId, row.id);
  }

  for (const chunk of chunkArray(raw.RENTAL_RATES)) {
    const F = DB.RENTAL_RATES.FIELDS;
    await db
      .insert(schema.rentalRates)
      .values(
        chunk.map((r) => ({
          organizationId: orgId,
          baserowId: Number(r.id),
          venueId: mapLinkedId(r[F.VENUE], venueMap),
          sessionId: mapLinkedId(r[F.SESSION], sessionMap),
          name: extractText(r[F.NAME]) ?? `Rate ${r.id}`,
          flatRate: extractNumber(r[F.FLAT_RATE]),
          hourlyRate: extractNumber(r[F.HOURLY_RATE]),
          weekendRate: extractNumber(r[F.WEEKEND_RATE]),
        }))
      )
      .onConflictDoUpdate({
        target: [schema.rentalRates.organizationId, schema.rentalRates.baserowId],
        set: { name: sql`excluded.name`, updatedAt: new Date() },
      });
  }

  for (const chunk of chunkArray(raw.SEATS)) {
    const F = DB.SEATS.FIELDS;
    await db
      .insert(schema.seats)
      .values(
        chunk.map((r) => ({
          organizationId: orgId,
          baserowId: Number(r.id),
          venueId: mapLinkedId(r[F.VENUE], venueMap),
          section: extractSelect(r[F.SECTION]),
          rowLabel: extractText(r[F.ROW_LABEL]),
          seatNumber: extractInt(r[F.SEAT_NUMBER]),
          status: extractSelect(r[F.STATUS]),
          gridX: extractInt(r[F.GRID_X]),
          gridY: extractInt(r[F.GRID_Y]),
        }))
      )
      .onConflictDoUpdate({
        target: [schema.seats.organizationId, schema.seats.baserowId],
        set: { status: sql`excluded.status`, section: sql`excluded.section` },
      });
  }

  for (const chunk of chunkArray(raw.STAFF_POSITIONS)) {
    const F = DB.STAFF_POSITIONS.FIELDS;
    const rows = await db
      .insert(schema.staffPositions)
      .values(
        chunk.map((r) => ({
          organizationId: orgId,
          baserowId: Number(r.id),
          roleName: extractText(r[F.ROLE_NAME]) ?? `Position ${r.id}`,
          department: extractSelect(r[F.DEPARTMENT]),
        }))
      )
      .onConflictDoUpdate({
        target: [schema.staffPositions.organizationId, schema.staffPositions.baserowId],
        set: { roleName: sql`excluded.role_name`, department: sql`excluded.department` },
      })
      .returning({ id: schema.staffPositions.id, baserowId: schema.staffPositions.baserowId });
    for (const row of rows) if (row.baserowId !== null) positionMap.set(row.baserowId, row.id);
  }
  console.log(
    `   ✓ venues: ${venueMap.size}, spaces: ${spaceMap.size}, seats: ${raw.SEATS.length}, staff_positions: ${positionMap.size}`
  );

  // 7. Productions, Performances, Show Team, Staff Interest
  for (const chunk of chunkArray(raw.PRODUCTIONS)) {
    const F = DB.PRODUCTIONS.FIELDS;
    const rows = await db
      .insert(schema.productions)
      .values(
        chunk.map((r) => ({
          organizationId: orgId,
          baserowId: Number(r.id),
          masterShowId: mapLinkedId(r[F.MASTER_SHOW_DATABASE], masterShowMap),
          seasonId: mapLinkedId(r[F.SEASON_LINKED], seasonMap),
          sessionId: mapLinkedId(r[F.SESSIONS], sessionMap),
          venueId: mapLinkedId(r[F.VENUE], venueMap),
          title: extractText(r[F.TITLE] ?? r[F.FULL_TITLE]) ?? `Production ${r.id}`,
          sessionLabel: extractSelect(r[F.SESSION]),
          type: extractSelect(r[F.TYPE]),
          status: extractSelect(r[F.STATUS]) ?? "Planning",
          location: extractSelect(r[F.LOCATION]),
          ticketPriceStandard: extractNumber(r[F.TICKET_PRICE_STANDARD]),
          ticketPriceAtDoor: extractNumber(r[F.TICKET_PRICE_AT_DOOR]),
          productionFee: extractNumber(r[F.PRODUCTION_FEE]),
          showImageUrl: extractFileUrl(r[F.SHOW_IMAGE]),
          legacyPerformancesJson: extractText(r[F.PERFORMANCES]),
          castListHtml: extractText(r[F.CAST_LIST_HTML]),
          allowResellers: extractBool(r[F.ALLOW_RESELLERS]),
          historicalCastSize: extractInt(r[F.HISTORICAL_CAST_SIZE]),
          workflowOverrides: extractMultiSelect(r[F.WORKFLOW_OVERRIDES]),
        }))
      )
      .onConflictDoUpdate({
        target: [schema.productions.organizationId, schema.productions.baserowId],
        set: {
          title: sql`excluded.title`,
          status: sql`excluded.status`,
          productionFee: sql`excluded.production_fee`,
          venueId: sql`excluded.venue_id`,
          masterShowId: sql`excluded.master_show_id`,
          updatedAt: new Date(),
        },
      })
      .returning({ id: schema.productions.id, baserowId: schema.productions.baserowId });
    for (const row of rows) if (row.baserowId !== null) prodMap.set(row.baserowId, row.id);
  }

  for (const chunk of chunkArray(raw.PERFORMANCES)) {
    const F = DB.PERFORMANCES.FIELDS;
    await db
      .insert(schema.performances)
      .values(
        chunk.map((r) => ({
          organizationId: orgId,
          baserowId: Number(r.id),
          productionId: mapLinkedId(r[F.PRODUCTION], prodMap),
          label: extractText(r[F.PERFORMANCE]),
          performanceDate: extractText(r[F.DATE]),
          totalInventory: extractInt(r[F.TOTAL_INVENTORY]) ?? 0,
          ticketsSold: extractInt(r[F.TICKETS_SOLD]) ?? 0,
        }))
      )
      .onConflictDoUpdate({
        target: [schema.performances.organizationId, schema.performances.baserowId],
        set: {
          ticketsSold: sql`excluded.tickets_sold`,
          totalInventory: sql`excluded.total_inventory`,
          updatedAt: new Date(),
        },
      });
  }

  for (const chunk of chunkArray(raw.SHOW_TEAM)) {
    const F = DB.SHOW_TEAM.FIELDS;
    await db
      .insert(schema.showTeam)
      .values(
        chunk.map((r) => ({
          organizationId: orgId,
          baserowId: Number(r.id),
          productionId: mapLinkedId(r[F.PRODUCTIONS], prodMap),
          personId: mapLinkedId(r[F.PERSON], personMap),
          positionId: mapLinkedId(r[F.POSITION], positionMap),
          status: extractSelect(r[F.STATUS]) ?? "Active",
        }))
      )
      .onConflictDoUpdate({
        target: [schema.showTeam.organizationId, schema.showTeam.baserowId],
        set: { status: sql`excluded.status`, positionId: sql`excluded.position_id` },
      });
  }

  for (const chunk of chunkArray(raw.STAFF_INTEREST)) {
    const F = DB.STAFF_INTEREST.FIELDS;
    await db
      .insert(schema.staffInterest)
      .values(
        chunk.map((r) => ({
          organizationId: orgId,
          baserowId: Number(r.id),
          personId: mapLinkedId(r[F.PERSON], personMap),
          seasonId: mapLinkedId(r[F.SEASON], seasonMap),
          name: extractText(r[F.NAME]),
          availability: safeParseJson<Record<string, unknown>>(r[F.AVAILABILITY_JSON], {}),
          preferredPositionIds: mapLinkedIds(r[F.ROLE_PREFERENCES], positionMap),
          constraints: extractText(r[F.CONSTRAINTS]),
        }))
      )
      .onConflictDoUpdate({
        target: [schema.staffInterest.organizationId, schema.staffInterest.baserowId],
        set: { constraints: sql`excluded.constraints` },
      });
  }
  console.log(
    `   ✓ productions: ${prodMap.size}, performances: ${raw.PERFORMANCES.length}, show_team: ${raw.SHOW_TEAM.length}`
  );

  // 8. Blueprint Roles, Audition Slots, Auditions, Assignments, Signatures, Student Bios
  for (const chunk of chunkArray(raw.BLUEPRINT_ROLES)) {
    const F = DB.BLUEPRINT_ROLES.FIELDS;
    const rows = await db
      .insert(schema.blueprintRoles)
      .values(
        chunk.map((r) => ({
          organizationId: orgId,
          baserowId: Number(r.id),
          masterShowId: mapLinkedId(r[F.MASTER_SHOW_DATABASE], masterShowMap),
          roleName: extractText(r[F.ROLE_NAME]) ?? `Role ${r.id}`,
          roleType: extractText(r[F.ROLE_TYPE]),
          castingConstraints: extractSelect(r[F.CASTING_CONSTRAINTS]),
          vocalRange: extractText(r[F.VOCAL_RANGE]),
        }))
      )
      .onConflictDoUpdate({
        target: [schema.blueprintRoles.organizationId, schema.blueprintRoles.baserowId],
        set: { roleName: sql`excluded.role_name`, vocalRange: sql`excluded.vocal_range` },
      })
      .returning({ id: schema.blueprintRoles.id, baserowId: schema.blueprintRoles.baserowId });
    for (const row of rows) if (row.baserowId !== null) roleMap.set(row.baserowId, row.id);
  }

  for (const chunk of chunkArray(raw.AUDITION_SLOTS)) {
    const F = DB.AUDITION_SLOTS.FIELDS;
    const rows = await db
      .insert(schema.auditionSlots)
      .values(
        chunk.map((r) => ({
          organizationId: orgId,
          baserowId: Number(r.id),
          productionId: mapLinkedId(r[F.PRODUCTION], prodMap),
          timeLabel: extractText(r[F.TIME_LABEL]) ?? `Slot ${r.id}`,
          dateTime: extractText(r[F.DATE_TIME]),
          capacity: extractInt(r[F.CAPACITY]) ?? 12,
        }))
      )
      .onConflictDoUpdate({
        target: [schema.auditionSlots.organizationId, schema.auditionSlots.baserowId],
        set: { timeLabel: sql`excluded.time_label`, capacity: sql`excluded.capacity` },
      })
      .returning({ id: schema.auditionSlots.id, baserowId: schema.auditionSlots.baserowId });
    for (const row of rows) if (row.baserowId !== null) slotMap.set(row.baserowId, row.id);
  }

  for (const chunk of chunkArray(raw.AUDITIONS)) {
    const F = DB.AUDITIONS.FIELDS;
    const rows = await db
      .insert(schema.auditions)
      .values(
        chunk.map((r) => ({
          organizationId: orgId,
          baserowId: Number(r.id),
          productionId: mapLinkedId(r[F.PRODUCTION], prodMap),
          performerId: mapLinkedId(r[F.PERFORMER], personMap),
          slotId: mapLinkedId(r[F.AUDITION_SLOTS], slotMap),
          vocalScore: extractNumber(r[F.VOCAL_SCORE]),
          actingScore: extractNumber(r[F.ACTING_SCORE]),
          stagePresenceScore: extractNumber(r[F.STAGE_PRESENCE_SCORE]),
          danceScore: extractNumber(r[F.DANCE_SCORE]),
          actingNotes: extractText(r[F.ACTING_NOTES]),
          choreographyNotes: extractText(r[F.CHOREOGRAPHY_NOTES]),
          musicNotes: extractText(r[F.MUSIC_NOTES]),
          dropInNotes: extractText(r[F.DROP_IN_NOTES]),
          adminNotes: extractText(r[F.ADMIN_NOTES]),
          lobbyNote: extractText(r[F.LOBBY_NOTE]),
          auditionDate: extractText(r[F.DATE]),
          song: extractText(r[F.SONG]),
          monologue: extractText(r[F.MONOLOGUE]),
          vocalRange: extractText(r[F.VOCAL_RANGE]),
          voiceType: extractSelect(r[F.VOICE_TYPE]),
          auditionVideoUrl: extractFileUrl(r[F.AUDITION_VIDEO]),
          danceVideoUrl: extractText(r[F.DANCE_VIDEO]),
          backingTrackUrl: extractFileUrl(r[F.BACKING_TRACK]),
          checkedIn: extractBool(r[F.CHECKED_IN]),
          commitmentToCharacter: extractBool(r[F.COMMITMENT_TO_CHARACTER]),
          paidFees: extractBool(r[F.PAID_FEES]),
          productionFeeStatus: extractSelect(r[F.PRODUCTION_FEE_STATUS]),
          measurementsTaken: extractBool(r[F.MEASUREMENTS_TAKEN]),
          grade: extractSelect(r[F.GRADE]),
          hairColor: extractText(r[F.HAIR_COLOR]),
          acceptAnyRole: extractBool(r[F.ACCEPT_ANY_ROLE]),
          offBookAgreement: extractBool(r[F.OFF_BOOK_AGREEMENT]),
          parentHelpAgreement: extractBool(r[F.PARENT_HELP_AGREEMENT]),
          signaturesText: extractText(r[F.SIGNATURES]),
          programBio: extractText(r[F.PROGRAM_BIO]),
          congratsAdText: extractText(r[F.CONGRATS_AD_TEXT]),
          castPartyRsvp: extractSelect(r[F.CAST_PARTY_RSVP]),
          scriptScoreNumber: extractText(r[F.SCRIPT_SCORE_NUMBER]),
          auditionNumber: extractText(r[F.AUDITION_NUMBER]),
          status: extractSelect(r[F.STATUS]) ?? "Pending",
          callbackStatus: extractSelect(r[F.CALLBACK_STATUS]),
          willingToAlterAppearance: extractBool(r[F.WILLING_TO_ALTER_APPEARANCE]),
          fearOfHeights: extractBool(r[F.FEAR_OF_HEIGHTS]),
          otherTalents: extractText(r[F.OTHER_TALENTS]),
          referralSource: extractText(r[F.REFERRAL_SOURCE]),
          preferredRoles: extractText(r[F.PREFERRED_ROLES]),
          stageRomance: extractBool(r[F.STAGE_ROMANCE]),
        }))
      )
      .onConflictDoUpdate({
        target: [schema.auditions.organizationId, schema.auditions.baserowId],
        set: {
          vocalScore: sql`excluded.vocal_score`,
          actingScore: sql`excluded.acting_score`,
          stagePresenceScore: sql`excluded.stage_presence_score`,
          danceScore: sql`excluded.dance_score`,
          checkedIn: sql`excluded.checked_in`,
          paidFees: sql`excluded.paid_fees`,
          status: sql`excluded.status`,
          callbackStatus: sql`excluded.callback_status`,
          updatedAt: new Date(),
        },
      })
      .returning({ id: schema.auditions.id, baserowId: schema.auditions.baserowId });
    for (const row of rows) if (row.baserowId !== null) auditionMap.set(row.baserowId, row.id);
  }

  for (const chunk of chunkArray(raw.ASSIGNMENTS)) {
    const F = DB.ASSIGNMENTS.FIELDS;
    await db
      .insert(schema.assignments)
      .values(
        chunk.map((r) => ({
          organizationId: orgId,
          baserowId: Number(r.id),
          productionId: mapLinkedId(r[F.PRODUCTION], prodMap),
          personId: mapLinkedId(r[F.PERSON], personMap),
          roleId: mapLinkedId(r[F.PERFORMANCE_IDENTITY], roleMap),
          auditionId: mapLinkedId(r[F.AUDITIONS], auditionMap),
        }))
      )
      .onConflictDoUpdate({
        target: [schema.assignments.organizationId, schema.assignments.baserowId],
        set: {
          personId: sql`excluded.person_id`,
          roleId: sql`excluded.role_id`,
          updatedAt: new Date(),
        },
      });
  }

  for (const chunk of chunkArray(raw.SIGNATURES)) {
    const F = DB.SIGNATURES.FIELDS;
    await db
      .insert(schema.signatures)
      .values(
        chunk.map((r) => ({
          organizationId: orgId,
          baserowId: Number(r.id),
          productionId: mapLinkedId(r[F.PRODUCTION], prodMap),
          personId: mapLinkedId(r[F.VERIFIED_CAST_MEMBER], personMap),
          parentSignerName: extractText(r[F.PARENT_SIGNER_NAME]),
          signerEmail: normalizeEmail(r[F.SIGNER_EMAIL]),
          docType: extractSelect(r[F.DOC_TYPE]),
          initials: extractText(r[F.INITIALS_DIGITAL_SIG]),
          signedAt: extractText(r[F.TIMESTAMP]),
          performerBio: extractText(r[F.PERFORMER_BIO]),
          congratsAd: extractText(r[F.CONGRATS_AD]),
        }))
      )
      .onConflictDoUpdate({
        target: [schema.signatures.organizationId, schema.signatures.baserowId],
        set: { initials: sql`excluded.initials` },
      });
  }

  for (const chunk of chunkArray(raw.STUDENT_BIO)) {
    const F = DB.STUDENT_BIO.FIELDS;
    await db
      .insert(schema.studentBios)
      .values(
        chunk.map((r) => ({
          organizationId: orgId,
          baserowId: Number(r.id),
          productionId: mapLinkedId(r[F.PRODUCTION_SESSION], prodMap),
          personId: mapLinkedId(r[F.LINKED_PERSON], personMap),
          studentFirstName: extractText(r[F.STUDENT_FIRST_NAME]),
          studentLastName: extractText(r[F.STUDENT_LAST_NAME]),
          dateOfBirth: extractText(r[F.DATE_OF_BIRTH]),
          preferredName: extractText(r[F.PREFERRED_NAME]),
          guardianFirstName: extractText(r[F.GUARDIAN_FIRST_NAME]),
          guardianLastName: extractText(r[F.GUARDIAN_LAST_NAME]),
          guardianEmail: normalizeEmail(r[F.GUARDIAN_EMAIL]),
          guardianPhone: extractText(r[F.GUARDIAN_PHONE]),
          priorExperience: extractText(r[F.PRIOR_CYT_EXPERIENCE]),
          medicalNotes: extractText(r[F.MEDICAL_NOTES]),
          processed: extractBool(r[F.PROCESSED]),
        }))
      )
      .onConflictDoUpdate({
        target: [schema.studentBios.organizationId, schema.studentBios.baserowId],
        set: { processed: sql`excluded.processed` },
      });
  }
  console.log(
    `   ✓ roles: ${roleMap.size}, audition_slots: ${slotMap.size}, auditions: ${auditionMap.size}, assignments: ${raw.ASSIGNMENTS.length}`
  );

  // 9. Events, Scenes, Scene Assignments, Schedule Slots, Attendance, Conflicts, Assets, Committees
  for (const chunk of chunkArray(raw.EVENTS)) {
    const F = DB.EVENTS.FIELDS;
    const rows = await db
      .insert(schema.events)
      .values(
        chunk.map((r) => ({
          organizationId: orgId,
          baserowId: Number(r.id),
          productionId: mapLinkedId(r[F.PRODUCTION], prodMap),
          eventDate: extractText(r[F.EVENT_DATE]),
          startTime: extractText(r[F.START_TIME]),
          endTime: extractText(r[F.END_TIME]),
          eventType: extractSelect(r[F.EVENT_TYPE]),
          isRequired: extractBool(r[F.IS_REQUIRED]),
          conflictAllowed: extractBool(r[F.CONFLICT_ALLOWED]),
          notes: extractText(r[F.NOTES]),
        }))
      )
      .onConflictDoUpdate({
        target: [schema.events.organizationId, schema.events.baserowId],
        set: { eventDate: sql`excluded.event_date`, notes: sql`excluded.notes` },
      })
      .returning({ id: schema.events.id, baserowId: schema.events.baserowId });
    for (const row of rows) if (row.baserowId !== null) eventMap.set(row.baserowId, row.id);
  }

  for (const chunk of chunkArray(raw.SCENES)) {
    const F = DB.SCENES.FIELDS;
    const rows = await db
      .insert(schema.scenes)
      .values(
        chunk.map((r) => ({
          organizationId: orgId,
          baserowId: Number(r.id),
          productionId: mapLinkedId(r[F.PRODUCTION], prodMap),
          sceneName: extractText(r[F.SCENE_NAME]) ?? `Scene ${r.id}`,
          act: extractSelect(r[F.ACT]),
          sceneSize: extractSelect(r[F.SCENE_SIZE]),
          minimumPerformers: extractInt(r[F.MINIMUM_PERFORMERS]),
          countsTowardMinimum: extractBool(r[F.COUNTS_TOWARD_MINIMUM_SCENES]),
          location: extractText(r[F.LOCATION]),
          sceneType: extractSelect(r[F.SCENE_TYPE]),
          sortOrder: extractInt(r[F.ORDER]) ?? 0,
          musicStatus: extractSelect(r[F.MUSIC_STATUS]),
          danceStatus: extractSelect(r[F.DANCE_STATUS]),
          blockingStatus: extractSelect(r[F.BLOCKING_STATUS]),
          musicLoad: extractNumber(r[F.MUSIC_LOAD]),
          danceLoad: extractNumber(r[F.DANCE_LOAD]),
          blockingLoad: extractNumber(r[F.BLOCKING_LOAD]),
          pages: extractText(r[F.PAGES]),
          blueprintRoleIds: mapLinkedIds(r[F.BLUEPRINT_ROLES], roleMap),
        }))
      )
      .onConflictDoUpdate({
        target: [schema.scenes.organizationId, schema.scenes.baserowId],
        set: {
          sceneName: sql`excluded.scene_name`,
          musicStatus: sql`excluded.music_status`,
          danceStatus: sql`excluded.dance_status`,
          blockingStatus: sql`excluded.blocking_status`,
        },
      })
      .returning({ id: schema.scenes.id, baserowId: schema.scenes.baserowId });
    for (const row of rows) if (row.baserowId !== null) sceneMap.set(row.baserowId, row.id);
  }

  for (const chunk of chunkArray(raw.SCENE_ASSIGNMENTS)) {
    const F = DB.SCENE_ASSIGNMENTS.FIELDS;
    await db
      .insert(schema.sceneAssignments)
      .values(
        chunk.map((r) => ({
          organizationId: orgId,
          baserowId: Number(r.id),
          productionId: mapLinkedId(r[F.PRODUCTION], prodMap),
          sceneId: mapLinkedId(r[F.SCENE], sceneMap),
          personId: mapLinkedId(r[F.PERSON], personMap),
          countsTowardMinimum: extractBool(r[F.COUNTS_TOWARD_MINIMUM]),
          notes: extractText(r[F.NOTES_OPTIONAL]),
          slotType: extractSelect(r[F.SLOT_TYPE]),
        }))
      )
      .onConflictDoUpdate({
        target: [schema.sceneAssignments.organizationId, schema.sceneAssignments.baserowId],
        set: { notes: sql`excluded.notes` },
      });
  }

  for (const chunk of chunkArray(raw.SCHEDULE_SLOTS)) {
    const F = DB.SCHEDULE_SLOTS.FIELDS;
    await db
      .insert(schema.scheduleSlots)
      .values(
        chunk.map((r) => ({
          organizationId: orgId,
          baserowId: Number(r.id),
          eventId: mapLinkedId(r[F.EVENT_LINK], eventMap),
          sceneId: mapLinkedId(r[F.SCENE], sceneMap),
          name: extractText(r[F.NAME]),
          active: extractBool(r[F.ACTIVE]),
          track: extractSelect(r[F.TRACK]),
          startTime: extractText(r[F.START_TIME]),
          endTime: extractText(r[F.END_TIME]),
          duration: extractInt(r[F.DURATION]),
        }))
      )
      .onConflictDoUpdate({
        target: [schema.scheduleSlots.organizationId, schema.scheduleSlots.baserowId],
        set: { active: sql`excluded.active`, track: sql`excluded.track` },
      });
  }

  for (const chunk of chunkArray(raw.ATTENDANCE)) {
    const F = DB.ATTENDANCE.FIELDS;
    await db
      .insert(schema.attendance)
      .values(
        chunk.map((r) => ({
          organizationId: orgId,
          baserowId: Number(r.id),
          productionId: mapLinkedId(r[F.PRODUCTION], prodMap),
          eventId: mapLinkedId(r[F.REHEARSAL_PRODUCTION_EVENTS], eventMap),
          personId: mapLinkedId(r[F.PERSON], personMap),
          checkedInById: mapLinkedId(r[F.CHECKED_IN_BY], personMap),
          checkInTime: extractText(r[F.CHECK_IN_TIME]),
          checkOutTime: extractText(r[F.CHECK_OUT_TIME]),
          status: extractSelect(r[F.STATUS]),
          notes: extractText(r[F.NOTES]),
        }))
      )
      .onConflictDoUpdate({
        target: [schema.attendance.organizationId, schema.attendance.baserowId],
        set: { status: sql`excluded.status`, checkOutTime: sql`excluded.check_out_time` },
      });
  }

  for (const chunk of chunkArray(raw.CONFLICTS)) {
    const F = DB.CONFLICTS.FIELDS;
    await db
      .insert(schema.conflicts)
      .values(
        chunk.map((r) => ({
          organizationId: orgId,
          baserowId: Number(r.id),
          productionId: mapLinkedId(r[F.PRODUCTION], prodMap),
          eventId: mapLinkedId(r[F.PRODUCTION_EVENT], eventMap),
          personId: mapLinkedId(r[F.PERSON], personMap),
          conflictType: extractSelect(r[F.CONFLICT_TYPE]),
          minutesLateEarly: extractInt(r[F.MINUTES_LATE_EARLY]),
          submittedVia: extractSelect(r[F.SUBMITTED_VIA]),
          notes: extractText(r[F.NOTES]),
        }))
      )
      .onConflictDoUpdate({
        target: [schema.conflicts.organizationId, schema.conflicts.baserowId],
        set: { notes: sql`excluded.notes`, conflictType: sql`excluded.conflict_type` },
      });
  }

  for (const chunk of chunkArray(raw.ASSETS)) {
    const F = DB.ASSETS.FIELDS;
    await db
      .insert(schema.assets)
      .values(
        chunk.map((r) => ({
          organizationId: orgId,
          baserowId: Number(r.id),
          productionId: mapLinkedId(r[F.PRODUCTION], prodMap),
          name: extractText(r[F.NAME]) ?? `Asset ${r.id}`,
          url: extractText(r[F.LINK]),
          type: extractSelect(r[F.TYPE]),
        }))
      )
      .onConflictDoUpdate({
        target: [schema.assets.organizationId, schema.assets.baserowId],
        set: { name: sql`excluded.name`, url: sql`excluded.url` },
      });
  }

  for (const chunk of chunkArray(raw.COMMITTEE_PREFS)) {
    const F = DB.COMMITTEE_PREFS.FIELDS;
    await db
      .insert(schema.committeePrefs)
      .values(
        chunk.map((r) => ({
          organizationId: orgId,
          baserowId: Number(r.id),
          productionId: mapLinkedId(r[F.PRODUCTION], prodMap),
          parentPersonId: mapLinkedId(r[F.PARENT_GUARDIAN_NAME], personMap),
          studentPersonId: mapLinkedId(r[F.STUDENT_ID], personMap),
          preShow1: extractSelect(r[F.PRE_SHOW_1ST]),
          preShow2: extractSelect(r[F.PRE_SHOW_2ND]),
          preShow3: extractSelect(r[F.PRE_SHOW_3RD]),
          showWeek1: extractSelect(r[F.SHOW_WEEK_1ST]),
          showWeek2: extractSelect(r[F.SHOW_WEEK_2ND]),
          showWeek3: extractSelect(r[F.SHOW_WEEK_3RD]),
          chairInterest: extractMultiSelect(r[F.CHAIR_INTEREST]),
          notes: extractText(r[F.NOTES_CONSTRAINTS]),
          processed: extractBool(r[F.PROCESSED]),
          assignedPreShow: extractSelect(r[F.PRE_SHOW_PHASE]),
          assignedShowWeek: extractSelect(r[F.SHOW_WEEK_COMMITTEES]),
          isChair: extractBool(r[F.IS_CHAIR]),
          ticketsSold: extractInt(r[F.TICKETS_SOLD]) ?? 0,
        }))
      )
      .onConflictDoUpdate({
        target: [schema.committeePrefs.organizationId, schema.committeePrefs.baserowId],
        set: {
          assignedPreShow: sql`excluded.assigned_pre_show`,
          assignedShowWeek: sql`excluded.assigned_show_week`,
          isChair: sql`excluded.is_chair`,
        },
      });
  }

  for (const chunk of chunkArray(raw.COMMITTEE_REPORTS)) {
    const F = DB.COMMITTEE_REPORTS.FIELDS;
    await db
      .insert(schema.committeeReports)
      .values(
        chunk.map((r) => ({
          organizationId: orgId,
          baserowId: Number(r.id),
          productionId: mapLinkedId(r[F.PRODUCTION], prodMap),
          submitterId: mapLinkedId(r[F.SUBMITTER], personMap),
          name: extractText(r[F.NAME]),
          committeeName: extractSelect(r[F.COMMITTEE_NAME]),
          reportDate: extractText(r[F.REPORT_DATE]),
          productionPhase: extractSelect(r[F.PRODUCTION_PHASE]),
          progressUpdate: extractText(r[F.PROGRESS_UPDATE]),
          attendanceNotes: extractText(r[F.ATTENDANCE_NOTES]),
          blockersAndNeeds: extractText(r[F.BLOCKERS_AND_NEEDS]),
          estimatedCompletion: extractInt(r[F.ESTIMATED_COMPLETION]),
          moneySpentThisWeek: extractNumber(r[F.MONEY_SPENT_THIS_WEEK]),
          receiptUrls: extractFileUrls(r[F.RECEIPTS]),
        }))
      )
      .onConflictDoUpdate({
        target: [schema.committeeReports.organizationId, schema.committeeReports.baserowId],
        set: { progressUpdate: sql`excluded.progress_update` },
      });
  }
  console.log(
    `   ✓ events: ${eventMap.size}, scenes: ${sceneMap.size}, scene_assignments: ${raw.SCENE_ASSIGNMENTS.length}, conflicts: ${raw.CONFLICTS.length}`
  );

  // 10. Measurements, Garment Inventory (with SKU/QR), Classes & Class Enrollments
  for (const chunk of chunkArray(raw.MEASUREMENTS)) {
    const F = DB.MEASUREMENTS.FIELDS;
    await db
      .insert(schema.measurements)
      .values(
        chunk.map((r) => ({
          organizationId: orgId,
          baserowId: Number(r.id),
          personId: mapLinkedId(r[F.PERSON], personMap),
          measuredAt: extractText(r[F.DATE]),
          height: extractNumber(r[F.HEIGHT]),
          chest: extractNumber(r[F.CHEST]),
          waist: extractNumber(r[F.WAIST]),
          hips: extractNumber(r[F.HIPS]),
          inseam: extractNumber(r[F.INSEAM]),
          girth: extractNumber(r[F.GIRTH]),
          neck: extractNumber(r[F.NECK]),
          hatHead: extractNumber(r[F.HAT_HEAD]),
          shoeSize: extractNumber(r[F.SHOE_SIZE]),
          gloveSize: extractSelect(r[F.GLOVE_SIZE]),
        }))
      )
      .onConflictDoUpdate({
        target: [schema.measurements.organizationId, schema.measurements.baserowId],
        set: { height: sql`excluded.height`, chest: sql`excluded.chest` },
      });
  }

  for (const chunk of chunkArray(raw.GARMENT_INVENTORY)) {
    const F = DB.GARMENT_INVENTORY.FIELDS;
    await db
      .insert(schema.garmentInventory)
      .values(
        chunk.map((r) => {
          const bId = Number(r.id);
          const sku = extractText(r[F.GARMENT_ID]) ?? `GAR-${bId}`;
          return {
            organizationId: orgId,
            baserowId: bId,
            sku,
            qrCodeValue: extractText(r[F.QR_CODE_LINK]) ?? `openbackstage://garment/${tenant}/${sku}`,
            photoUrl: extractFileUrl(r[F.PHOTO]),
            category: extractSelect(r[F.CATEGORY]),
            binLocation: extractText(r[F.BIN_LOCATION]),
            chest: extractNumber(r[F.CHEST]),
            waist: extractNumber(r[F.WAIST]),
            hips: extractNumber(r[F.HIPS]),
            inseam: extractNumber(r[F.INSEAM]),
            girth: extractNumber(r[F.GIRTH]),
            neck: extractNumber(r[F.NECK]),
            hatHead: extractNumber(r[F.HAT_HEAD]),
            shoeSize: extractNumber(r[F.SHOE_SIZE]),
            gloveSize: extractSelect(r[F.GLOVE_SIZE]),
          };
        })
      )
      .onConflictDoUpdate({
        target: [schema.garmentInventory.organizationId, schema.garmentInventory.baserowId],
        set: { binLocation: sql`excluded.bin_location`, updatedAt: new Date() },
      });
  }

  const enrollmentRows: Array<{ organizationId: number; classId: number; studentId: number }> = [];
  for (const chunk of chunkArray(raw.CLASSES)) {
    const F = DB.CLASSES.FIELDS;
    const rows = await db
      .insert(schema.classes)
      .values(
        chunk.map((r) => ({
          organizationId: orgId,
          baserowId: Number(r.id),
          sessionId: mapLinkedId(r[F.SESSION], sessionMap),
          teacherId: mapLinkedId(r[F.TEACHER], personMap),
          spaceId: mapLinkedId(r[F.SPACE], spaceMap),
          className: extractText(r[F.CLASS_NAME] ?? r[F.FULL_CLASS_NAME]) ?? `Class ${r.id}`,
          location: extractSelect(r[F.LOCATION]),
          day: extractSelect(r[F.DAY]),
          timeSlot: extractSelect(r[F.TIME_SLOT]),
          minAge: extractInt(r[F.MINIMUM_AGE]),
          maxAge: extractInt(r[F.MAXIMUM_AGE]),
          type: extractSelect(r[F.TYPE]),
          isCoreCurriculum: extractBool(r[F.IS_CORE_CURRICULUM]),
          status: extractSelect(r[F.STATUS]) ?? "Active",
          description: extractText(r[F.DESCRIPTION]),
          objectives: extractText(r[F.OBJECTIVES]),
        }))
      )
      .onConflictDoUpdate({
        target: [schema.classes.organizationId, schema.classes.baserowId],
        set: {
          className: sql`excluded.class_name`,
          status: sql`excluded.status`,
          updatedAt: new Date(),
        },
      })
      .returning({ id: schema.classes.id, baserowId: schema.classes.baserowId });

    for (const row of rows) if (row.baserowId !== null) classMap.set(row.baserowId, row.id);
  }

  for (const r of raw.CLASSES) {
    const F = DB.CLASSES.FIELDS;
    const classId = classMap.get(Number(r.id));
    if (!classId) continue;
    for (const sBId of extractAllLinkIds(r[F.STUDENTS])) {
      const studentId = personMap.get(sBId);
      if (studentId) enrollmentRows.push({ organizationId: orgId, classId, studentId });
    }
  }

  for (const chunk of chunkArray(enrollmentRows)) {
    await db.insert(schema.classEnrollments).values(chunk).onConflictDoNothing();
  }

  const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(
    `   ✓ measurements: ${raw.MEASUREMENTS.length}, garments: ${raw.GARMENT_INVENTORY.length}, classes: ${classMap.size} (${enrollmentRows.length} enrollments)`
  );
  console.log(`\n🎉 Import complete for "${org.name}" (${org.slug}) in ${elapsedSec}s!`);
}

main().catch((err) => {
  console.error("\n❌ Baserow import failed:", err);
  process.exit(1);
});
