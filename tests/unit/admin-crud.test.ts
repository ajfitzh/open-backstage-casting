import test from "node:test";
import assert from "node:assert/strict";
import {
  computeNextAuditionNumber,
  derivePaidBoolean,
  normalizeAuditionStatus,
  normalizeFeeStatus,
  sanitizeRolesList,
  splitFullName,
  validateEmailOptional,
} from "../../app/lib/admin-crud-helpers.ts";

test("splitFullName handles multi-word, single-word, and blank names", () => {
  assert.deepEqual(splitFullName("  Jane   Marie   Doe  "), {
    firstName: "Jane",
    lastName: "Marie Doe",
    fullName: "Jane Marie Doe",
  });
  assert.deepEqual(splitFullName("Cher"), {
    firstName: "Cher",
    lastName: "",
    fullName: "Cher",
  });
  assert.deepEqual(splitFullName("   "), {
    firstName: "",
    lastName: "",
    fullName: "",
  });
});

test("normalizeAuditionStatus normalizes variants cleanly", () => {
  assert.equal(normalizeAuditionStatus("cast"), "Cast");
  assert.equal(normalizeAuditionStatus("callback"), "Called Back");
  assert.equal(normalizeAuditionStatus("Called Back"), "Called Back");
  assert.equal(normalizeAuditionStatus("withdrawn"), "Dropped");
  assert.equal(normalizeAuditionStatus("Not Cast"), "Not Cast");
  assert.equal(normalizeAuditionStatus(undefined), "Pending");
});

test("derivePaidBoolean and normalizeFeeStatus handle cash/check/waiver overrides", () => {
  assert.equal(derivePaidBoolean("Paid (Cash)"), true);
  assert.equal(derivePaidBoolean("Scholarship / Waived"), true);
  assert.equal(derivePaidBoolean("Unpaid"), false);
  assert.equal(derivePaidBoolean("Unpaid", true), true);

  assert.equal(normalizeFeeStatus(true, "Paid (Check)"), "Paid (Check)");
  assert.equal(normalizeFeeStatus(true, ""), "Paid (Manual Override)");
  assert.equal(normalizeFeeStatus(false, null), "Unpaid");
});

test("validateEmailOptional accepts blank or valid email and rejects malformed", () => {
  assert.equal(validateEmailOptional(""), null);
  assert.equal(validateEmailOptional("  Director@Stage.ORG "), "director@stage.org");
  assert.throws(() => validateEmailOptional("not-an-email"), /Invalid email/);
});

test("computeNextAuditionNumber increments from highest numeric audition #", () => {
  assert.equal(computeNextAuditionNumber([]), "1");
  assert.equal(computeNextAuditionNumber(["1", "14", "N/A", null, "#22"]), "23");
});

test("sanitizeRolesList filters unknown roles and deduplicates", () => {
  const allowed = new Set(["Admin", "Staff", "Student"]);
  assert.deepEqual(
    sanitizeRolesList(["Admin", "Hacker", "Staff", "Admin", "  Student "], allowed),
    ["Admin", "Staff", "Student"]
  );
});
