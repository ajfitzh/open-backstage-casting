import test from "node:test";
import assert from "node:assert/strict";
import {
  buildIcsCalendar,
  buildStudentQrPayload,
  computeCheckoutProgress,
  parseStudentQrPayload,
  parseTimeTo24Hour,
  resolveCallSheetRecipients,
} from "../../app/lib/features-helpers.ts";

test("parseTimeTo24Hour handles 12h and 24h formats", () => {
  assert.deepEqual(parseTimeTo24Hour("6:00 PM"), { hour: 18, minute: 0 });
  assert.deepEqual(parseTimeTo24Hour("12:30 AM"), { hour: 0, minute: 30 });
  assert.deepEqual(parseTimeTo24Hour("12:15 PM"), { hour: 12, minute: 15 });
  assert.deepEqual(parseTimeTo24Hour("18:45:00"), { hour: 18, minute: 45 });
  assert.deepEqual(parseTimeTo24Hour("9am"), { hour: 9, minute: 0 });
  assert.equal(parseTimeTo24Hour(""), null);
  assert.equal(parseTimeTo24Hour("invalid"), null);
});

test("buildIcsCalendar outputs valid RFC 5545 calendar with timed and all-day events", () => {
  const ics = buildIcsCalendar({
    calendarName: "Annie, Jr. (Main Stage)",
    now: new Date("2026-11-26T12:00:00Z"),
    events: [
      {
        uid: "evt-1@open-backstage.org",
        title: "Full Cast Rehearsal; Act 1",
        date: "2026-12-04",
        startTime: "6:00 PM",
        endTime: "9:00 PM",
        location: "Studio A, Room 2",
        description: "Bring scripts\nWear sneakers",
      },
      {
        uid: "evt-2@open-backstage.org",
        title: "Tech Load-In",
        date: "2026-12-05",
      },
    ],
  });

  assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n"));
  assert.ok(ics.includes("X-WR-CALNAME:Annie\\, Jr. (Main Stage)\r\n"));
  assert.ok(ics.includes("DTSTART:20261204T180000\r\n"));
  assert.ok(ics.includes("DTEND:20261204T210000\r\n"));
  assert.ok(ics.includes("SUMMARY:Full Cast Rehearsal\\; Act 1\r\n"));
  assert.ok(ics.includes("DESCRIPTION:Bring scripts\\nWear sneakers\r\n"));
  assert.ok(ics.includes("DTSTART;VALUE=DATE:20261205\r\n"));
  assert.ok(ics.includes("DTEND;VALUE=DATE:20261206\r\n"));
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
});

test("resolveCallSheetRecipients deduplicates family emails and flags matching conflicts", () => {
  const res = resolveCallSheetRecipients({
    calledNames: ["Alice Smith", "Bob Jones", "Charlie NoEmail"],
    eventDate: "2026-12-04",
    roster: [
      { id: 1, name: "Alice Smith", email: "PARENT@example.com", secondaryEmail: "dad@example.com" },
      { id: 2, name: "Bob Jones", email: "parent@example.com" }, // duplicate family email
      { id: 3, name: "Charlie NoEmail", email: "" },
      { id: 4, name: "Not Called Actor", email: "other@example.com" },
    ],
    conflicts: [
      { personName: "Alice Smith", date: "2026-12-04", reason: "Band concert" },
      { personName: "Bob Jones", date: "2026-12-05", reason: "Different day" },
      { personName: "Not Called Actor", date: "2026-12-04", reason: "Not called anyway" },
    ],
  });

  assert.equal(res.matchedActorCount, 3);
  assert.equal(res.recipientCount, 2);
  assert.deepEqual(res.emails.sort(), ["dad@example.com", "parent@example.com"]);
  assert.deepEqual(res.missingEmailNames, ["Charlie NoEmail"]);
  assert.deepEqual(res.conflictAlerts, [{ name: "Alice Smith", reason: "Band concert" }]);
});

test("student QR payload builds and parses URI, prefix, and numeric ID formats", () => {
  const uri = buildStudentQrPayload("cytfred", 4281);
  assert.equal(uri, "openbackstage://cytfred/student/4281");
  assert.deepEqual(parseStudentQrPayload(uri), { tenant: "cytfred", studentId: 4281 });
  assert.deepEqual(parseStudentQrPayload("OB-STUDENT:905"), { tenant: null, studentId: 905 });
  assert.deepEqual(parseStudentQrPayload("1234"), { tenant: null, studentId: 1234 });
  assert.equal(parseStudentQrPayload("openbackstage://cytfred/garment/OB-001"), null);
  assert.equal(parseStudentQrPayload("not-a-qr"), null);
});

test("computeCheckoutProgress tracks returned vs checked-out items per show", () => {
  const items = [
    { status: "Available", assignedProductionId: 10 },
    { status: "Available", assignedProductionId: 10 },
    { status: "Checked Out", assignedProductionId: 10 },
    { status: "In Repair", assignedProductionId: 10 },
    { status: "Checked Out", assignedProductionId: 20 },
  ];

  const show10 = computeCheckoutProgress(items, 10);
  assert.equal(show10.totalTracked, 4);
  assert.equal(show10.returned, 2);
  assert.equal(show10.checkedOut, 1);
  assert.equal(show10.inRepair, 1);
  assert.equal(show10.percentReturned, 50);

  const show99 = computeCheckoutProgress(items, 99);
  assert.equal(show99.totalTracked, 0);
  assert.equal(show99.percentReturned, 100);
});
