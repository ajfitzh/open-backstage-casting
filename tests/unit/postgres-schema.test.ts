import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getTableName, getTableColumns } from "drizzle-orm";
import * as schema from "../../db/schema/index.ts";
import { isPostgresEnabled } from "../../db/index.ts";
import {
  computeAgeFromDob,
  derivePrimaryAppRole,
  deriveWorkspaceDisplayRole,
  formatHeightFromInches,
  normalizeAndValidateOrgSlug,
  pickUniqueAuditionNumber,
} from "../../app/lib/db/role-helpers.ts";

describe("PostgreSQL multi-tenant Drizzle schema", () => {
  const tenantScopedTables = [
    schema.families,
    schema.people,
    schema.passwordResetTokens,
    schema.masterShows,
    schema.seasons,
    schema.sessions,
    schema.venues,
    schema.spaces,
    schema.rentalRates,
    schema.seats,
    schema.productions,
    schema.performances,
    schema.ticketOrders,
    schema.tickets,
    schema.promoCodes,
    schema.staffPositions,
    schema.showTeam,
    schema.staffInterest,
    schema.blueprintRoles,
    schema.auditionSlots,
    schema.auditions,
    schema.auditionJudgeScores,
    schema.assignments,
    schema.signatures,
    schema.studentBios,
    schema.events,
    schema.scenes,
    schema.sceneAssignments,
    schema.scheduleSlots,
    schema.attendance,
    schema.conflicts,
    schema.assets,
    schema.committeePrefs,
    schema.committeeReports,
    schema.measurements,
    schema.garmentInventory,
    schema.techEquipment,
    schema.classes,
    schema.classEnrollments,
  ];

  it("defines organizations + onboarding requests + all 39 tenant-scoped tables", () => {
    assert.equal(getTableName(schema.organizations), "organizations");
    assert.equal(
      getTableName(schema.organizationOnboardingRequests),
      "organization_onboarding_requests"
    );
    assert.equal(tenantScopedTables.length, 39);
  });

  it("ensures every tenant-scoped table has an organizationId foreign-key column", () => {
    for (const table of tenantScopedTables) {
      const cols = getTableColumns(table);
      assert.ok(
        "organizationId" in cols,
        `Table ${getTableName(table)} is missing organizationId column`
      );
    }
  });

  it("includes SKU and QR code fields on garment_inventory for barcode tracking", () => {
    const cols = getTableColumns(schema.garmentInventory);
    assert.ok("sku" in cols);
    assert.ok("qrCodeValue" in cols);
    assert.ok("binLocation" in cols);
    assert.ok("photoUrl" in cols);
  });

  it("respects DATABASE_URL and DATA_BACKEND flags in isPostgresEnabled()", () => {
    const origUrl = process.env.DATABASE_URL;
    const origBackend = process.env.DATA_BACKEND;
    try {
      delete process.env.DATABASE_URL;
      delete process.env.DATA_BACKEND;
      assert.equal(isPostgresEnabled(), false);

      process.env.DATABASE_URL = "postgresql://user:pass@ep-test.neon.tech/neondb";
      assert.equal(isPostgresEnabled(), true);

      process.env.DATA_BACKEND = "baserow";
      assert.equal(isPostgresEnabled(), false);
    } finally {
      if (origUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = origUrl;
      if (origBackend === undefined) delete process.env.DATA_BACKEND;
      else process.env.DATA_BACKEND = origBackend;
    }
  });

  it("derives primary app roles and workspace display roles consistently", () => {
    assert.equal(derivePrimaryAppRole(["Student", "Admin"]), "Admin");
    assert.equal(derivePrimaryAppRole(["Executive Director"]), "Admin");
    assert.equal(derivePrimaryAppRole(["Director"]), "Staff");
    assert.equal(derivePrimaryAppRole(["Check In Team"]), "Volunteer");
    assert.equal(derivePrimaryAppRole(["Parent/Guardian"]), "Parent/Guardian");
    assert.equal(derivePrimaryAppRole([]), "Student");

    assert.equal(deriveWorkspaceDisplayRole(["Parent/Guardian", "Admin"]), "Admin");
    assert.equal(deriveWorkspaceDisplayRole(["Executive Director"]), "Executive Director");
    assert.equal(deriveWorkspaceDisplayRole([]), "Member");
  });

  it("validates and normalizes organization subdomains safely", () => {
    assert.deepEqual(
      normalizeAndValidateOrgSlug(undefined, "Riverside High Drama Club"),
      { valid: true, slug: "riverside-high-drama-club" }
    );
    assert.deepEqual(
      normalizeAndValidateOrgSlug("  CYT_Austin! ", "Ignored"),
      { valid: true, slug: "cyt-austin" }
    );
    const reserved = normalizeAndValidateOrgSlug("admin", "Admin Theater");
    assert.equal(reserved.valid, false);
    const tooShort = normalizeAndValidateOrgSlug("ab", "AB");
    assert.equal(tooShort.valid, false);
  });

  it("assigns unique audition numbers and formats heights and ages cleanly", () => {
    const used = new Set<number>();
    for (let i = 1; i <= 49; i++) used.add(i);
    assert.equal(pickUniqueAuditionNumber(used), 50);

    used.add(50);
    assert.equal(pickUniqueAuditionNumber(used), 51);

    assert.equal(formatHeightFromInches(65), `5'5"`);
    assert.equal(formatHeightFromInches(null), "");
    assert.ok(computeAgeFromDob("2010-01-01") >= 15);
    assert.equal(computeAgeFromDob(null), 0);
  });
});
