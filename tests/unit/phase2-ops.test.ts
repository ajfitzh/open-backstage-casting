import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyPromoCodeDiscount,
  buildRehearsalReportEmailHtml,
  normalizeCastTrack,
  normalizePromoCode,
} from "../../app/lib/phase2-helpers.ts";

describe("Phase 2 Box Office, Stage Management & Double-Casting helpers", () => {
  it("normalizes promo codes and calculates percent, fixed, and comp discounts", () => {
    assert.equal(normalizePromoCode("  cast-20! "), "CAST-20");

    const pct = applyPromoCodeDiscount({
      unitPriceCents: 1500,
      quantity: 2,
      promo: {
        code: "CAST20",
        discountType: "percent",
        discountValue: 20,
        active: true,
        maxUses: 50,
        currentUses: 5,
      },
    });
    assert.equal(pct.ok, true);
    if (pct.ok) {
      assert.equal(pct.subtotalCents, 3000);
      assert.equal(pct.discountCents, 600);
      assert.equal(pct.totalCents, 2400);
    }

    const fixed = applyPromoCodeDiscount({
      unitPriceCents: 1500,
      quantity: 2,
      promo: {
        code: "SAVE10",
        discountType: "fixed",
        discountValue: 10,
        active: true,
        maxUses: null,
        currentUses: 0,
      },
    });
    assert.equal(fixed.ok, true);
    if (fixed.ok) {
      assert.equal(fixed.totalCents, 2000);
    }

    const comp = applyPromoCodeDiscount({
      unitPriceCents: 1500,
      quantity: 4,
      promo: {
        code: "VIPCOMP",
        discountType: "comp",
        discountValue: 100,
        active: true,
        maxUses: 10,
        currentUses: 1,
      },
    });
    assert.equal(comp.ok, true);
    if (comp.ok) {
      assert.equal(comp.totalCents, 0);
    }
  });

  it("rejects inactive, expired, or exhausted promo codes", () => {
    const inactive = applyPromoCodeDiscount({
      unitPriceCents: 1500,
      quantity: 1,
      promo: {
        code: "OLD",
        discountType: "percent",
        discountValue: 10,
        active: false,
        maxUses: null,
        currentUses: 0,
      },
    });
    assert.equal(inactive.ok, false);

    const exhausted = applyPromoCodeDiscount({
      unitPriceCents: 1500,
      quantity: 1,
      promo: {
        code: "LIMIT",
        discountType: "percent",
        discountValue: 10,
        active: true,
        maxUses: 5,
        currentUses: 5,
      },
    });
    assert.equal(exhausted.ok, false);
  });

  it("normalizes cast tracks and renders escaped rehearsal report HTML", () => {
    assert.equal(normalizeCastTrack("cast a"), "Cast A");
    assert.equal(normalizeCastTrack("B"), "Cast B");
    assert.equal(normalizeCastTrack("u/s"), "Understudy");
    assert.equal(normalizeCastTrack(""), "All");

    const html = buildRehearsalReportEmailHtml({
      orgName: "CYT Fredericksburg",
      productionTitle: "Into The Woods",
      reportDate: "2026-05-01",
      stageManagerName: "Alex SM",
      presentCount: 32,
      lateNames: ["Sam"],
      absentNames: ["Jordan"],
      highlights: "Blocked Act 1 <Opening>",
      techCostumeNotes: "Need cape for Red",
    });
    assert.ok(html.includes("Into The Woods"));
    assert.ok(html.includes("&lt;Opening&gt;"));
    assert.ok(html.includes("Need cape for Red"));
  });
});
