import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildCastNotificationPlan,
  generateAuditionSlotsPlan,
  generateRawResetToken,
  hashResetToken,
  signCalendarToken,
  validateNewPassword,
  verifyCalendarToken,
} from "../../app/lib/phase1-helpers.ts";

describe("Phase 1 Launch Readiness helpers", () => {
  it("generates high-entropy reset tokens and deterministic SHA-256 hashes", () => {
    const t1 = generateRawResetToken();
    const t2 = generateRawResetToken();
    assert.notEqual(t1, t2);
    assert.ok(t1.length >= 32);
    assert.equal(hashResetToken(t1), hashResetToken(t1));
    assert.equal(hashResetToken(t1).length, 64);

    assert.equal(validateNewPassword("short").ok, false);
    assert.equal(validateNewPassword("StrongPass123!").ok, true);
  });

  it("generates standardized audition slots chronologically with capacity", () => {
    const plan = generateAuditionSlotsPlan({
      date: "2026-05-01", // Friday
      startTime: "17:00",
      endTime: "20:00",
      slotMinutes: 60,
      capacity: 12,
    });
    assert.equal(plan.ok, true);
    if (plan.ok) {
      assert.equal(plan.slots.length, 3);
      assert.equal(plan.slots[0].timeLabel, "Friday 5:00 PM");
      assert.equal(plan.slots[1].timeLabel, "Friday 6:00 PM");
      assert.equal(plan.slots[2].timeLabel, "Friday 7:00 PM");
      assert.equal(plan.slots[0].capacity, 12);
    }

    const bad = generateAuditionSlotsPlan({
      date: "2026-05-01",
      startTime: "20:00",
      endTime: "17:00",
      slotMinutes: 60,
      capacity: 12,
    });
    assert.equal(bad.ok, false);
  });

  it("signs and verifies HMAC calendar feed tokens and rejects tampering", () => {
    const token = signCalendarToken({ tenant: "cytfred", productionId: 115, studentId: 42 });
    assert.equal(
      verifyCalendarToken(token, { tenant: "cytfred", productionId: 115, studentId: 42 }),
      true
    );
    assert.equal(
      verifyCalendarToken(token, { tenant: "cytfred", productionId: 115, studentId: 99 }),
      false
    );
    assert.equal(
      verifyCalendarToken("tampered-token", { tenant: "cytfred", productionId: 115, studentId: 42 }),
      false
    );
  });

  it("categorizes cast offers, non-cast thank-yous, and callback invitations cleanly", () => {
    const plan = buildCastNotificationPlan([
      {
        auditionId: 1,
        personId: 10,
        studentName: "Ava",
        email: "ava@example.com",
        isCalledBack: true,
        callbackGroup: "Belle",
        assignedRoles: ["Belle"],
      },
      {
        auditionId: 2,
        personId: 11,
        studentName: "Noah",
        email: "noah@example.com",
        isCalledBack: false,
        callbackGroup: "",
        assignedRoles: [],
      },
      {
        auditionId: 3,
        personId: 12,
        studentName: "No Email",
        email: "",
        isCalledBack: true,
        callbackGroup: "Beast",
        assignedRoles: ["Beast"],
      },
    ]);

    assert.equal(plan.castOffers.length, 1);
    assert.equal(plan.notCast.length, 1);
    assert.equal(plan.callbacks.length, 1);
    assert.equal(plan.castOffers[0].studentName, "Ava");
    assert.equal(plan.notCast[0].studentName, "Noah");
  });
});
