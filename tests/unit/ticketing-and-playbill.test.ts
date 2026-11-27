import test from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import {
  buildBookletImpositionSheets,
  buildTicketQrPayload,
  computeRemainingSeats,
  generateTicketCode,
  parseTicketOrderMetadata,
  parseTicketQrPayload,
  validateTicketOrderRequest,
} from "../../app/lib/ticketing-helpers.ts";
import {
  generatePlaybillPdf,
  HALF_LETTER_HEIGHT,
  HALF_LETTER_WIDTH,
  LETTER_LANDSCAPE_HEIGHT,
  LETTER_LANDSCAPE_WIDTH,
  sanitizePdfText,
} from "../../app/lib/playbill-pdf.ts";

test("ticket code generation and QR payload parsing round-trip cleanly", () => {
  const code = generateTicketCode();
  assert.match(code, /^OBT-[A-F0-9]{4}-[A-F0-9]{4}$/);

  const uri = buildTicketQrPayload("cytfred", code);
  assert.equal(uri, `openbackstage://cytfred/ticket/${code}`);
  assert.deepEqual(parseTicketQrPayload(uri), { tenant: "cytfred", code });
  assert.deepEqual(parseTicketQrPayload(code), { tenant: null, code });
  assert.equal(parseTicketQrPayload("openbackstage://cytfred/student/123"), null);
  assert.equal(parseTicketQrPayload("invalid"), null);
});

test("validateTicketOrderRequest enforces salesOpen, seat cap, max order size, and email", () => {
  assert.equal(computeRemainingSeats(200, 185), 15);
  assert.equal(computeRemainingSeats(100, 120), 0);

  const ok = validateTicketOrderRequest({
    quantity: 3,
    remainingSeats: 15,
    salesOpen: true,
    unitPriceDollars: 15.5,
    buyerName: "Jane Doe",
    buyerEmail: "JANE@Example.com",
  });
  assert.equal(ok.valid, true);
  if (ok.valid) {
    assert.equal(ok.unitPriceCents, 1550);
    assert.equal(ok.totalCents, 4650);
    assert.equal(ok.buyerEmail, "jane@example.com");
  }

  const closed = validateTicketOrderRequest({
    quantity: 1,
    remainingSeats: 50,
    salesOpen: false,
    unitPriceDollars: 15,
    buyerName: "Jane Doe",
    buyerEmail: "jane@example.com",
  });
  assert.equal(closed.valid, false);

  const overCap = validateTicketOrderRequest({
    quantity: 5,
    remainingSeats: 2,
    salesOpen: true,
    unitPriceDollars: 15,
    buyerName: "Jane Doe",
    buyerEmail: "jane@example.com",
  });
  assert.equal(overCap.valid, false);

  const badEmail = validateTicketOrderRequest({
    quantity: 1,
    remainingSeats: 10,
    salesOpen: true,
    unitPriceDollars: 15,
    buyerName: "Jane Doe",
    buyerEmail: "not-an-email",
  });
  assert.equal(badEmail.valid, false);
});

test("parseTicketOrderMetadata parses valid ticket_order metadata and ignores others", () => {
  assert.deepEqual(
    parseTicketOrderMetadata({
      type: "ticket_order",
      tenant: "cytfred",
      orderId: "42",
      productionId: "115",
      performanceId: "7",
    }),
    {
      type: "ticket_order",
      tenant: "cytfred",
      orderId: 42,
      productionId: 115,
      performanceId: 7,
    }
  );
  assert.equal(parseTicketOrderMetadata({ type: "org_subscription", tenant: "cytfred" }), null);
  assert.equal(parseTicketOrderMetadata(null), null);
});

test("buildBookletImpositionSheets pads to multiples of 4 and imposes saddle-stitch pairs", () => {
  const four = buildBookletImpositionSheets(4);
  assert.equal(four.paddedPageCount, 4);
  assert.deepEqual(four.sheets, [{ front: [4, 1], back: [2, 3] }]);

  const six = buildBookletImpositionSheets(6);
  assert.equal(six.paddedPageCount, 8);
  assert.deepEqual(six.sheets, [
    { front: [null, 1], back: [2, null] },
    { front: [6, 3], back: [4, 5] },
  ]);
});

test("generatePlaybillPdf produces valid 5.5x8.5 half-letter PDF and 11x8.5 booklet PDF", async () => {
  assert.equal(sanitizePdfText("“Break a leg!” — Mom 🎭"), '"Break a leg!" - Mom');

  const sampleCast = [
    {
      name: "Alice Smith",
      role: "Annie",
      bio: "Alice is thrilled to perform in her third mainstage show! She loves singing, tap dancing, and her dog “Biscuit”.",
      ad: "We are so proud of you, Alice — shine bright!",
    },
    {
      name: "Ben Carter",
      role: "Daddy Warbucks",
      bio: "Ben has been acting for four years and thanks his family and directors.",
      ad: "",
    },
  ];

  // Reader mode: 5.5 x 8.5 in (396 x 612 pt)
  const readerBytes = await generatePlaybillPdf({
    orgName: "CYT Fredericksburg",
    showTitle: "Annie Jr.",
    location: "Riverside Theater",
    datesLabel: "May 14 - May 17, 2026",
    cast: sampleCast,
    mode: "reader",
  });
  const readerDoc = await PDFDocument.load(readerBytes);
  assert.ok(readerDoc.getPageCount() >= 4);
  const firstReaderPage = readerDoc.getPage(0);
  assert.equal(Math.round(firstReaderPage.getWidth()), HALF_LETTER_WIDTH);
  assert.equal(Math.round(firstReaderPage.getHeight()), HALF_LETTER_HEIGHT);

  // Booklet mode: 11 x 8.5 in landscape (792 x 612 pt)
  const bookletBytes = await generatePlaybillPdf({
    orgName: "CYT Fredericksburg",
    showTitle: "Annie Jr.",
    cast: sampleCast,
    mode: "booklet",
  });
  const bookletDoc = await PDFDocument.load(bookletBytes);
  assert.equal(bookletDoc.getPageCount() % 2, 0);
  const firstSheet = bookletDoc.getPage(0);
  assert.equal(Math.round(firstSheet.getWidth()), LETTER_LANDSCAPE_WIDTH);
  assert.equal(Math.round(firstSheet.getHeight()), LETTER_LANDSCAPE_HEIGHT);
});
