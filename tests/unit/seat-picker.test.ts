import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatSeatLabel,
  formatShortSeatTag,
  groupSeatsForDisplay,
  validateRequestedSeats,
  type PublicSeatItem,
} from "../../app/lib/seat-picker-helpers.ts";

describe("seat-picker-helpers", () => {
  it("formats full and short seat labels cleanly", () => {
    assert.equal(
      formatSeatLabel({ section: "Center", rowLabel: "C", seatNumber: 4 }),
      "Center • Row C, Seat 4"
    );
    assert.equal(formatSeatLabel({ rowLabel: "A", seatNumber: 12 }), "Row A, Seat 12");
    assert.equal(formatShortSeatTag({ rowLabel: "C", seatNumber: 4 }), "C-4");
  });

  it("groups seats by section (Left -> Center -> Right) and row/seat number", () => {
    const seats: PublicSeatItem[] = [
      { id: 1, section: "Right", rowLabel: "B", seatNumber: 2, availability: "available", gridX: null, gridY: null },
      { id: 2, section: "Center", rowLabel: "A", seatNumber: 3, availability: "available", gridX: null, gridY: null },
      { id: 3, section: "Center", rowLabel: "A", seatNumber: 1, availability: "ada", gridX: null, gridY: null },
      { id: 4, section: "Left", rowLabel: "A", seatNumber: 1, availability: "taken", gridX: null, gridY: null },
    ];
    const grouped = groupSeatsForDisplay(seats);
    assert.deepEqual(grouped.map((g) => g.section), ["Left", "Center", "Right"]);
    assert.deepEqual(
      grouped[1].rows[0].seats.map((s) => s.seatNumber),
      [1, 3]
    );
  });

  it("validates seat selection and catches double-booking conflicts", () => {
    const venueSeatIds = new Set([10, 11, 12, 13]);
    const unavailableSeatIds = new Set([12]);

    const okRes = validateRequestedSeats({
      requestedSeatIds: [10, 11, 10],
      venueSeatIds,
      unavailableSeatIds,
      maxPerOrder: 6,
    });
    assert.equal(okRes.ok, true);
    if (okRes.ok) assert.deepEqual(okRes.seatIds, [10, 11]);

    const conflictRes = validateRequestedSeats({
      requestedSeatIds: [11, 12],
      venueSeatIds,
      unavailableSeatIds,
      maxPerOrder: 6,
    });
    assert.equal(conflictRes.ok, false);
    if (!conflictRes.ok) assert.deepEqual(conflictRes.conflictSeatIds, [12]);
  });
});
