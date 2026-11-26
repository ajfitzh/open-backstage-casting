// app/lib/features-helpers.ts
// Pure helpers for ICS calendar feeds, Call Sheets, Student QR Passes, and Show Load-Out tracking.
// Kept free of path aliases so Node ESM unit tests can import directly.

export interface IcsEventInput {
  uid: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime?: string | null; // e.g. "18:00", "6:00 PM"
  endTime?: string | null;
  location?: string | null;
  description?: string | null;
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function parseTimeTo24Hour(raw: string | null | undefined): { hour: number; minute: number } | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Match "6:30 PM", "06:30pm", "18:30", "18:30:00", "6 PM"
  const match = trimmed.match(/^(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match) return null;

  let hour = parseInt(match[1], 10);
  const minute = match[2] ? parseInt(match[2], 10) : 0;
  const meridiem = match[3]?.toUpperCase();

  if (Number.isNaN(hour) || Number.isNaN(minute) || minute < 0 || minute > 59) return null;

  if (meridiem === "PM" && hour < 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;

  if (hour < 0 || hour > 23) return null;
  return { hour, minute };
}

function formatIcsDatePart(dateStr: string): string | null {
  const clean = dateStr.trim().slice(0, 10);
  const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return `${match[1]}${match[2]}${match[3]}`;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function nextDayIcsDate(yyyymmdd: string): string {
  const year = Number(yyyymmdd.slice(0, 4));
  const month = Number(yyyymmdd.slice(4, 6)) - 1;
  const day = Number(yyyymmdd.slice(6, 8));
  const dt = new Date(Date.UTC(year, month, day + 1));
  return `${dt.getUTCFullYear()}${pad2(dt.getUTCMonth() + 1)}${pad2(dt.getUTCDate())}`;
}

export function buildIcsCalendar(options: {
  calendarName: string;
  events: IcsEventInput[];
  now?: Date;
}): string {
  const stampDate = options.now ?? new Date();
  const dtStamp =
    `${stampDate.getUTCFullYear()}${pad2(stampDate.getUTCMonth() + 1)}${pad2(stampDate.getUTCDate())}` +
    `T${pad2(stampDate.getUTCHours())}${pad2(stampDate.getUTCMinutes())}${pad2(stampDate.getUTCSeconds())}Z`;

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Open Backstage//Rehearsal Schedule//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(options.calendarName)}`,
  ];

  for (const ev of options.events) {
    const datePart = formatIcsDatePart(ev.date);
    if (!datePart) continue;

    const startParsed = parseTimeTo24Hour(ev.startTime);
    const endParsed = parseTimeTo24Hour(ev.endTime);

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${escapeIcsText(ev.uid)}`);
    lines.push(`DTSTAMP:${dtStamp}`);

    if (startParsed) {
      const dtStart = `${datePart}T${pad2(startParsed.hour)}${pad2(startParsed.minute)}00`;
      const endHour = endParsed ? endParsed.hour : Math.min(23, startParsed.hour + 2);
      const endMinute = endParsed ? endParsed.minute : startParsed.minute;
      const dtEnd = `${datePart}T${pad2(endHour)}${pad2(endMinute)}00`;
      lines.push(`DTSTART:${dtStart}`);
      lines.push(`DTEND:${dtEnd}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${datePart}`);
      lines.push(`DTEND;VALUE=DATE:${nextDayIcsDate(datePart)}`);
    }

    lines.push(`SUMMARY:${escapeIcsText(ev.title || "Rehearsal")}`);
    if (ev.location?.trim()) {
      lines.push(`LOCATION:${escapeIcsText(ev.location.trim())}`);
    }
    if (ev.description?.trim()) {
      lines.push(`DESCRIPTION:${escapeIcsText(ev.description.trim())}`);
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

// ============================================================================
// CALL SHEET RECIPIENT & CONFLICT RESOLUTION
// ============================================================================

export interface CallSheetRosterMember {
  id: number;
  name: string;
  email?: string | null;
  secondaryEmail?: string | null;
}

export interface CallSheetConflict {
  personName?: string | null;
  personId?: number | null;
  date?: string | null;
  reason?: string | null;
}

export function resolveCallSheetRecipients(options: {
  calledNames: string[];
  roster: CallSheetRosterMember[];
  conflicts?: CallSheetConflict[];
  eventDate?: string | null;
}) {
  const normalizedCalled = new Set(
    options.calledNames.map((n) => n.trim().toLowerCase()).filter(Boolean)
  );
  const useAllCast = normalizedCalled.size === 0;

  const matchedPeople = options.roster.filter((person) =>
    useAllCast ? true : normalizedCalled.has(person.name.trim().toLowerCase())
  );

  const emailSet = new Set<string>();
  const missingEmailNames: string[] = [];

  for (const person of matchedPeople) {
    let foundAny = false;
    for (const candidate of [person.email, person.secondaryEmail]) {
      const clean = (candidate || "").trim().toLowerCase();
      if (clean && clean.includes("@")) {
        emailSet.add(clean);
        foundAny = true;
      }
    }
    if (!foundAny) {
      missingEmailNames.push(person.name);
    }
  }

  const targetDate = (options.eventDate || "").trim().slice(0, 10);
  const conflictAlerts: { name: string; reason: string }[] = [];
  if (targetDate && options.conflicts?.length) {
    for (const conflict of options.conflicts) {
      const cDate = (conflict.date || "").trim().slice(0, 10);
      if (cDate && cDate !== targetDate) continue;
      const cName = (conflict.personName || "").trim();
      if (!useAllCast && cName && !normalizedCalled.has(cName.toLowerCase())) continue;
      if (cName) {
        conflictAlerts.push({
          name: cName,
          reason: (conflict.reason || "Submitted conflict").trim(),
        });
      }
    }
  }

  return {
    recipientCount: emailSet.size,
    emails: Array.from(emailSet),
    matchedActorCount: matchedPeople.length,
    missingEmailNames,
    conflictAlerts,
  };
}

// ============================================================================
// STUDENT QR PASS PAYLOAD HELPERS
// ============================================================================

export function buildStudentQrPayload(tenantSlug: string, studentId: number | string): string {
  const cleanTenant = (tenantSlug || "org").trim().toLowerCase();
  const cleanId = String(studentId).trim();
  return `openbackstage://${cleanTenant}/student/${encodeURIComponent(cleanId)}`;
}

export function parseStudentQrPayload(
  raw: string
): { tenant: string | null; studentId: number } | null {
  const trimmed = (raw || "").trim();
  if (!trimmed) return null;

  // Format 1: openbackstage://<tenant>/student/<id>
  const uriMatch = trimmed.match(/^openbackstage:\/\/([^/]+)\/student\/(\d+)$/i);
  if (uriMatch) {
    const id = parseInt(uriMatch[2], 10);
    return Number.isFinite(id) ? { tenant: uriMatch[1].toLowerCase(), studentId: id } : null;
  }

  // Format 2: OB-STUDENT:<id>
  const prefixMatch = trimmed.match(/^OB-STUDENT:(\d+)$/i);
  if (prefixMatch) {
    const id = parseInt(prefixMatch[1], 10);
    return Number.isFinite(id) ? { tenant: null, studentId: id } : null;
  }

  // Format 3: Raw numeric ID
  if (/^\d+$/.test(trimmed)) {
    const id = parseInt(trimmed, 10);
    return Number.isFinite(id) ? { tenant: null, studentId: id } : null;
  }

  return null;
}

// ============================================================================
// SHOW LOAD-OUT / RETURN PROGRESS HELPERS
// ============================================================================

export interface LoadOutTrackableItem {
  status: string;
  assignedProductionId?: number | null;
}

export function computeCheckoutProgress(
  items: LoadOutTrackableItem[],
  productionId?: number | null
) {
  const scoped =
    productionId && productionId > 0
      ? items.filter((item) => item.assignedProductionId === productionId)
      : items.filter((item) => Boolean(item.assignedProductionId) || item.status === "Checked Out");

  const checkedOut = scoped.filter((item) => item.status === "Checked Out").length;
  const returned = scoped.filter((item) => item.status === "Available").length;
  const inRepair = scoped.filter((item) => item.status === "In Repair").length;
  const totalTracked = scoped.length;
  const percentReturned =
    totalTracked > 0 ? Math.round((returned / totalTracked) * 100) : 100;

  return {
    totalTracked,
    checkedOut,
    returned,
    inRepair,
    percentReturned,
  };
}
