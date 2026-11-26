import test from "node:test";
import assert from "node:assert/strict";
import {
  buildGarmentQrPayload,
  evaluateGarmentFit,
  formatAgeRangeHelper,
  formatDecimalHoursToHHMM,
  generateGarmentSku,
  matchShowImageKeyToProduction,
} from "../../app/lib/db/role-helpers.ts";

test("generateGarmentSku creates sequential clean SKUs by category", () => {
  assert.equal(generateGarmentSku("Dress", []), "OB-DRES-001");
  assert.equal(
    generateGarmentSku("Dress", ["OB-DRES-001", "OB-DRES-002"]),
    "OB-DRES-003"
  );
  assert.equal(generateGarmentSku("Hat / Headpiece", []), "OB-HATH-001");
  assert.equal(generateGarmentSku("", []), "OB-COS-001");
});

test("buildGarmentQrPayload normalizes tenant and encodes SKU", () => {
  assert.equal(
    buildGarmentQrPayload("CYTFred", "ob-dres-001"),
    "openbackstage://cytfred/garment/OB-DRES-001"
  );
  assert.equal(
    buildGarmentQrPayload("riverside", "PROP 42"),
    "openbackstage://riverside/garment/PROP%2042"
  );
});

test("evaluateGarmentFit classifies Great Fit, Alterable, Too Small, and Unmeasured", () => {
  assert.equal(
    evaluateGarmentFit({ chest: 34, waist: 28 }, { chest: 33, waist: 27 }).status,
    "Great Fit"
  );
  assert.equal(
    evaluateGarmentFit({ chest: 40, waist: 34 }, { chest: 34, waist: 28 }).status,
    "Alterable"
  );
  assert.equal(
    evaluateGarmentFit({ chest: 30, waist: 24 }, { chest: 34, waist: 28 }).status,
    "Too Small"
  );
  assert.equal(
    evaluateGarmentFit({ chest: null, waist: null }, { chest: 34, waist: 28 }).status,
    "Unmeasured"
  );
});

test("formatAgeRangeHelper formats class age ranges accurately", () => {
  assert.equal(formatAgeRangeHelper(0, 99), "All Ages");
  assert.equal(formatAgeRangeHelper(null, null), "All Ages");
  assert.equal(formatAgeRangeHelper(12, 99), "12+");
  assert.equal(formatAgeRangeHelper(0, 10), "Up to 10");
  assert.equal(formatAgeRangeHelper(8, 14), "8 - 14");
});

test("formatDecimalHoursToHHMM formats schedule start times cleanly", () => {
  assert.equal(formatDecimalHoursToHHMM(17.5), "17:30");
  assert.equal(formatDecimalHoursToHHMM(9), "09:00");
  assert.equal(formatDecimalHoursToHHMM(18.25), "18:15");
});

test("matchShowImageKeyToProduction matches show poster filenames accurately", () => {
  const prods = [
    { id: 1, title: "Into The Woods" },
    { id: 2, title: "Beauty and Beast (2012)" },
    { id: 3, title: "Wizard of Oz (2013)" },
    { id: 4, title: "Annie (2007)" },
  ];

  assert.equal(
    matchShowImageKeyToProduction("shows/into-the-woods-poster.jpg", prods)?.id,
    1
  );
  assert.equal(
    matchShowImageKeyToProduction("Beauty_and_the_Beast_2012.png", prods)?.id,
    2
  );
  assert.equal(
    matchShowImageKeyToProduction("Wizard-of-Oz-2013.webp", prods)?.id,
    3
  );
  // Reject mismatched year
  assert.equal(
    matchShowImageKeyToProduction("Annie-2025.jpg", prods),
    null
  );
});
