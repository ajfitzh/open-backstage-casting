import test from "node:test";
import assert from "node:assert/strict";
import {
  computeShowTicketStats,
  detectRoomConflicts,
  doTimeRangesOverlap,
  evaluateRoomCapacity,
  parseClassTimeRange,
} from "../../app/lib/reporting-helpers.ts";

test("parseClassTimeRange parses database range formats cleanly", () => {
  assert.deepEqual(parseClassTimeRange("06:00 PM-08:00 PM"), {
    startMinutes: 1080,
    endMinutes: 1200,
    startLabel: "6:00 PM",
  });
  assert.deepEqual(parseClassTimeRange("09:00AM-03:00PM"), {
    startMinutes: 540,
    endMinutes: 900,
    startLabel: "9:00 AM",
  });
  assert.deepEqual(parseClassTimeRange("6:30 PM"), {
    startMinutes: 1110,
    endMinutes: 1170,
    startLabel: "6:30 PM",
  });
  assert.equal(parseClassTimeRange("TBD"), null);
});

test("doTimeRangesOverlap and detectRoomConflicts catch double-booked rooms", () => {
  assert.equal(doTimeRangesOverlap("06:00 PM-08:00 PM", "07:00 PM-08:30 PM"), true);
  assert.equal(doTimeRangesOverlap("06:00 PM-07:00 PM", "07:00 PM-08:00 PM"), false);

  const conflicts = detectRoomConflicts([
    { id: 1, name: "Tap I", spaceId: 5, day: "Tuesday", time: "06:00 PM-07:30 PM" },
    { id: 2, name: "Jazz II", spaceId: 5, day: "Tuesday", time: "07:00 PM-08:30 PM" },
    { id: 3, name: "Improv", spaceId: 5, day: "Thursday", time: "06:00 PM-07:30 PM" },
    { id: 4, name: "Unassigned", spaceId: null, day: "Tuesday", time: "06:00 PM-08:00 PM" },
  ]);

  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].spaceId, 5);
  assert.deepEqual(conflicts[0].classIds, [1, 2]);
});

test("evaluateRoomCapacity flags ok, near_full, over_capacity, and unknown", () => {
  assert.deepEqual(evaluateRoomCapacity(12, 20), { status: "ok", utilizationPct: 60 });
  assert.deepEqual(evaluateRoomCapacity(18, 20), { status: "near_full", utilizationPct: 90 });
  assert.deepEqual(evaluateRoomCapacity(24, 20), { status: "over_capacity", utilizationPct: 120 });
  assert.deepEqual(evaluateRoomCapacity(10, null), { status: "unknown", utilizationPct: null });
});

test("computeShowTicketStats prevents hybrid double-counting and uses per-show + Stripe revenue", () => {
  // Hybrid show with BOTH legacy JSON and relational rows -> must use relational ONLY
  const hybrid = computeShowTicketStats({
    legacySold: 500,
    legacyCapacity: 600,
    legacyCount: 3,
    relationalPerformances: [
      { ticketsSold: 180, capacity: 200, ticketPrice: 20 },
      { ticketsSold: 190, capacity: 200, ticketPrice: 20 },
    ],
    productionTicketPrice: 18,
  });

  assert.equal(hybrid.source, "Modern Linked");
  assert.equal(hybrid.totalSold, 370);
  assert.equal(hybrid.totalCapacity, 400);
  assert.equal(hybrid.revenue, 7400);
  assert.equal(hybrid.avgFill, 93);

  // Legacy-only show uses productionTicketPrice rather than hardcoded $15
  const legacyOnly = computeShowTicketStats({
    legacySold: 100,
    legacyCapacity: 150,
    legacyCount: 2,
    relationalPerformances: [],
    productionTicketPrice: 18,
  });
  assert.equal(legacyOnly.source, "Legacy JSON");
  assert.equal(legacyOnly.revenue, 1800);

  // Actual Stripe revenue overrides lower estimate
  const stripeShow = computeShowTicketStats({
    legacySold: 0,
    legacyCapacity: 0,
    legacyCount: 0,
    relationalPerformances: [{ ticketsSold: 10, capacity: 100, ticketPrice: 15 }],
    actualStripeRevenueCents: 22500,
  });
  assert.equal(stripeShow.revenue, 225);
});
