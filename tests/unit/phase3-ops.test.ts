// tests/unit/phase3-ops.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeAvery5163LabelRects,
  computeClassAvailability,
  generateVenueSeatGrid,
  groupActorCostumePlot,
  nextSeatStatus,
  parseClassEnrollmentMetadata,
} from "../../app/lib/phase3-helpers.ts";
import { generateAveryQrLabelsPdf } from "../../app/lib/label-pdf.ts";

describe("Phase 3 Academy, Seating, Costume Plot & Avery QR Labels", () => {
  it("computes class availability and waitlist eligibility cleanly", () => {
    const open = computeClassAvailability({ capacity: 15, enrolledCount: 10, waitlistEnabled: true });
    assert.equal(open.remaining, 5);
    assert.equal(open.isFull, false);
    assert.equal(open.canEnroll, true);
    assert.equal(open.canWaitlist, false);

    const full = computeClassAvailability({ capacity: 15, enrolledCount: 15, waitlistEnabled: true });
    assert.equal(full.remaining, 0);
    assert.equal(full.isFull, true);
    assert.equal(full.canEnroll, false);
    assert.equal(full.canWaitlist, true);
  });

  it("parses Stripe class enrollment metadata and ignores unrelated sessions", () => {
    const valid = parseClassEnrollmentMetadata({
      type: "class_enrollment",
      tenant: "CYTFred",
      classId: "42",
      studentId: "105",
      paidCents: "12500",
    });
    assert.deepEqual(valid, {
      tenant: "cytfred",
      classId: 42,
      studentId: 105,
      paidCents: 12500,
    });
    assert.equal(parseClassEnrollmentMetadata({ type: "ticket_order" }), null);
  });

  it("generates venue seat grids and cycles seat statuses", () => {
    const grid = generateVenueSeatGrid({ section: "Orchestra", rowCount: 3, seatsPerRow: 4 });
    assert.equal(grid.length, 12);
    assert.equal(grid[0].rowLabel, "A");
    assert.equal(grid[11].rowLabel, "C");
    assert.equal(grid[11].seatNumber, 4);

    assert.equal(nextSeatStatus("available"), "vip");
    assert.equal(nextSeatStatus("vip"), "accessible");
    assert.equal(nextSeatStatus("accessible"), "blocked");
    assert.equal(nextSeatStatus("blocked"), "available");
  });

  it("groups garments per actor for the Per-Actor Costume Plot", () => {
    const plot = groupActorCostumePlot(
      [
        { personId: 1, name: "Alice", role: "Lead" },
        { personId: 2, name: "Bob", role: "Ensemble" },
      ],
      [
        {
          id: 10,
          sku: "GAR-001",
          category: "Dress",
          binLocation: "Rack A",
          notes: "Act 1",
          assignedPersonId: 1,
          assignedProductionId: 99,
        },
      ],
      99
    );
    assert.equal(plot[0].name, "Alice");
    assert.equal(plot[0].garments.length, 1);
    assert.equal(plot[1].garments.length, 0);
  });

  it("computes Avery 5163 label coordinates and generates a valid PDF with QR codes", async () => {
    const rects = computeAvery5163LabelRects(12);
    assert.equal(rects.length, 12);
    assert.equal(rects[0].pageIndex, 0);
    assert.equal(rects[10].pageIndex, 1);

    const pdfBytes = await generateAveryQrLabelsPdf(
      [
        {
          sku: "GAR-101",
          title: "Velvet Cape",
          subtitle: "Act 2 Quick Change",
          location: "Rack B-2",
          qrValue: "openbackstage://cytfred/garment/GAR-101",
        },
      ],
      "CYT Fredericksburg"
    );
    const header = new TextDecoder().decode(pdfBytes.slice(0, 5));
    assert.equal(header, "%PDF-");
    assert.ok(pdfBytes.length > 1000);
  });
});
