// app/lib/db/operations-repo.ts
// Phase 2C PostgreSQL repository: Scheduling, Scenes, Events, Attendance, Conflicts,
// Assets, Committees, Analytics, Playbill, Checkout, Season Board, and BaserowClient parity.

import { and, asc, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { parseRangeString } from "@/app/lib/vocalScience";
import { getOrganizationBySlugPg } from "./core-repo";
import {
  computeAgeFromDob,
  formatDecimalHoursToHHMM,
  formatHeightFromInches,
} from "./role-helpers";

function extId(row: { id: number; baserowId?: number | null }): number {
  return row.baserowId ?? row.id;
}

function personDisplayName(person: {
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}) {
  return (
    person.fullName?.trim() ||
    `${person.firstName || ""} ${person.lastName || ""}`.trim() ||
    "Unknown"
  );
}

async function resolveProductionRow(orgId: number, externalProdId: number) {
  const db = getDb();
  const [byId] = await db
    .select()
    .from(schema.productions)
    .where(and(eq(schema.productions.organizationId, orgId), eq(schema.productions.id, externalProdId)))
    .limit(1);
  if (byId) return byId;

  const [byBaserow] = await db
    .select()
    .from(schema.productions)
    .where(
      and(
        eq(schema.productions.organizationId, orgId),
        eq(schema.productions.baserowId, externalProdId)
      )
    )
    .limit(1);
  return byBaserow ?? null;
}

async function resolveEventRow(orgId: number, externalEventId: number) {
  const db = getDb();
  const [evt] = await db
    .select()
    .from(schema.events)
    .where(
      and(
        eq(schema.events.organizationId, orgId),
        or(eq(schema.events.baserowId, externalEventId), eq(schema.events.id, externalEventId))
      )
    )
    .limit(1);
  return evt ?? null;
}

async function resolveSceneRow(orgId: number, externalSceneId: number) {
  const db = getDb();
  const [scene] = await db
    .select()
    .from(schema.scenes)
    .where(
      and(
        eq(schema.scenes.organizationId, orgId),
        or(eq(schema.scenes.baserowId, externalSceneId), eq(schema.scenes.id, externalSceneId))
      )
    )
    .limit(1);
  return scene ?? null;
}

async function resolvePersonRow(orgId: number, externalPersonId: number) {
  const db = getDb();
  const [person] = await db
    .select()
    .from(schema.people)
    .where(
      and(
        eq(schema.people.organizationId, orgId),
        or(eq(schema.people.baserowId, externalPersonId), eq(schema.people.id, externalPersonId))
      )
    )
    .limit(1);
  return person ?? null;
}

async function resolveAssignmentRow(orgId: number, externalAssignId: number) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(schema.assignments)
    .where(
      and(
        eq(schema.assignments.organizationId, orgId),
        or(
          eq(schema.assignments.baserowId, externalAssignId),
          eq(schema.assignments.id, externalAssignId)
        )
      )
    )
    .limit(1);
  return row ?? null;
}

async function resolveAuditionRow(orgId: number, externalAudId: number) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(schema.auditions)
    .where(
      and(
        eq(schema.auditions.organizationId, orgId),
        or(eq(schema.auditions.baserowId, externalAudId), eq(schema.auditions.id, externalAudId))
      )
    )
    .limit(1);
  return row ?? null;
}

// ==============================================================================
// 📅 SCENES, EVENTS & SCHEDULING
// ==============================================================================

export async function getScenesPg(tenantSlug: string, externalProdId?: number) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const db = getDb();
  let rows;
  if (externalProdId) {
    const prod = await resolveProductionRow(org.id, externalProdId);
    if (!prod) return [];
    rows = await db
      .select()
      .from(schema.scenes)
      .where(
        and(eq(schema.scenes.organizationId, org.id), eq(schema.scenes.productionId, prod.id))
      );
  } else {
    rows = await db
      .select()
      .from(schema.scenes)
      .where(eq(schema.scenes.organizationId, org.id));
  }

  return rows
    .map((row) => ({
      id: extId(row),
      order: row.sortOrder ?? extId(row),
      name: row.sceneName || "Untitled Scene",
      type: row.sceneType || "Scene",
      act: row.act || "Act 1",
      status: {
        music: (row.musicStatus || "new").toLowerCase(),
        dance: (row.danceStatus || "new").toLowerCase(),
        block: (row.blockingStatus || "new").toLowerCase(),
      },
      load: {
        music: Math.round(row.musicLoad ?? 0),
        dance: Math.round(row.danceLoad ?? 0),
        block: Math.round(row.blockingLoad ?? 0),
      },
    }))
    .sort((a, b) => a.order - b.order);
}

export async function getScenesForShowClientPg(tenantSlug: string, externalProdId: number) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;
  const prod = await resolveProductionRow(org.id, externalProdId);
  if (!prod) return [];

  const db = getDb();
  const rows = await db
    .select()
    .from(schema.scenes)
    .where(and(eq(schema.scenes.organizationId, org.id), eq(schema.scenes.productionId, prod.id)));

  return rows
    .map((row) => ({
      id: extId(row),
      name: row.sceneName || `Scene ${extId(row)}`,
      sceneNumber: row.sceneName || `Scene ${extId(row)}`,
      act: row.act || "1",
      type: row.sceneType || "Scene",
      order: row.sortOrder || extId(row),
      load: {
        music: row.musicLoad || 1,
        dance: row.danceLoad || 1,
        block: row.blockingLoad || 1,
      },
    }))
    .sort((a, b) => a.order - b.order);
}

export async function getProductionEventsPg(tenantSlug: string, externalProdId: number) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;
  const prod = await resolveProductionRow(org.id, externalProdId);
  if (!prod) return [];

  const db = getDb();
  const rows = await db
    .select()
    .from(schema.events)
    .where(and(eq(schema.events.organizationId, org.id), eq(schema.events.productionId, prod.id)));

  return rows
    .map((row) => ({
      id: extId(row),
      date: row.eventDate || "",
      startTime: row.startTime || "",
      endTime: row.endTime || "",
      type: row.eventType || "Rehearsal",
      isRequired: Boolean(row.isRequired),
      notes: row.notes || "",
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export async function getScheduleSlotsPg(tenantSlug: string, externalProdId: number) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;
  const prod = await resolveProductionRow(org.id, externalProdId);
  if (!prod) return [];

  const db = getDb();
  const [eventRows, sceneRows] = await Promise.all([
    db
      .select()
      .from(schema.events)
      .where(and(eq(schema.events.organizationId, org.id), eq(schema.events.productionId, prod.id))),
    db
      .select()
      .from(schema.scenes)
      .where(and(eq(schema.scenes.organizationId, org.id), eq(schema.scenes.productionId, prod.id))),
  ]);

  const eventIds = eventRows.map((e) => e.id);
  const slotRows = await db
    .select()
    .from(schema.scheduleSlots)
    .where(
      eventIds.length > 0
        ? and(
            eq(schema.scheduleSlots.organizationId, org.id),
            or(
              eq(schema.scheduleSlots.productionId, prod.id),
              inArray(schema.scheduleSlots.eventId, eventIds)
            )
          )
        : and(
            eq(schema.scheduleSlots.organizationId, org.id),
            eq(schema.scheduleSlots.productionId, prod.id)
          )
    );

  const sceneExtMap = new Map(sceneRows.map((s) => [s.id, extId(s)]));

  return slotRows.map((row) => {
    const parsed = row.startTime ? new Date(row.startTime) : new Date();
    const hours = Number.isNaN(parsed.getTime())
      ? 0
      : parsed.getHours() + parsed.getMinutes() / 60;
    const dayName = !Number.isNaN(parsed.getTime()) && parsed.getDay() === 5 ? "Fri" : "Sat";

    return {
      id: extId(row).toString(),
      sceneId: (row.sceneId && sceneExtMap.get(row.sceneId)) || 0,
      track: row.track || "Acting",
      day: dayName,
      weekOffset: 0,
      startTime: hours,
      duration: row.duration || 30,
      status: "New",
    };
  });
}

export async function getSlotsForShowClientPg(tenantSlug: string, externalProdId: number) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;
  const prod = await resolveProductionRow(org.id, externalProdId);
  if (!prod) return [];

  const db = getDb();
  const [eventRows, sceneRows] = await Promise.all([
    db
      .select()
      .from(schema.events)
      .where(and(eq(schema.events.organizationId, org.id), eq(schema.events.productionId, prod.id))),
    db
      .select()
      .from(schema.scenes)
      .where(and(eq(schema.scenes.organizationId, org.id), eq(schema.scenes.productionId, prod.id))),
  ]);

  const eventExtMap = new Map(eventRows.map((e) => [e.id, extId(e)]));
  const sceneMap = new Map(sceneRows.map((s) => [s.id, { ext: extId(s), name: s.sceneName }]));
  const eventIds = eventRows.map((e) => e.id);

  const slotRows = await db
    .select()
    .from(schema.scheduleSlots)
    .where(
      eventIds.length > 0
        ? and(
            eq(schema.scheduleSlots.organizationId, org.id),
            or(
              eq(schema.scheduleSlots.productionId, prod.id),
              inArray(schema.scheduleSlots.eventId, eventIds)
            )
          )
        : and(
            eq(schema.scheduleSlots.organizationId, org.id),
            eq(schema.scheduleSlots.productionId, prod.id)
          )
    );

  return slotRows.map((row) => {
    const sceneInfo = row.sceneId ? sceneMap.get(row.sceneId) : null;
    return {
      id: extId(row),
      eventId: (row.eventId && eventExtMap.get(row.eventId)) ?? null,
      sceneId: sceneInfo?.ext ?? null,
      sceneName: sceneInfo?.name || row.name || "Unknown Scene",
      track: row.track || "Blocking",
      startTime: row.startTime || "",
      endTime: row.endTime || "",
      duration: row.duration || 0,
    };
  });
}

export async function getSceneAssignmentsPg(tenantSlug: string, externalProdId: number) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;
  const prod = await resolveProductionRow(org.id, externalProdId);
  if (!prod) return [];

  const db = getDb();
  const [rows, sceneRows, peopleRows] = await Promise.all([
    db
      .select()
      .from(schema.sceneAssignments)
      .where(
        and(
          eq(schema.sceneAssignments.organizationId, org.id),
          eq(schema.sceneAssignments.productionId, prod.id)
        )
      ),
    db
      .select()
      .from(schema.scenes)
      .where(and(eq(schema.scenes.organizationId, org.id), eq(schema.scenes.productionId, prod.id))),
    db.select().from(schema.people).where(eq(schema.people.organizationId, org.id)),
  ]);

  const sceneMap = new Map(sceneRows.map((s) => [s.id, { id: extId(s), value: s.sceneName }]));
  const personMap = new Map(
    peopleRows.map((p) => [p.id, { id: extId(p), value: personDisplayName(p) }])
  );

  return rows.map((row) => ({
    id: extId(row),
    productionId: extId(prod),
    sceneId: row.sceneId ? sceneMap.get(row.sceneId)?.id ?? null : null,
    personId: row.personId ? personMap.get(row.personId)?.id ?? null : null,
    Scene: row.sceneId && sceneMap.get(row.sceneId) ? [sceneMap.get(row.sceneId)] : [],
    Person: row.personId && personMap.get(row.personId) ? [personMap.get(row.personId)] : [],
    notes: row.notes || "",
  }));
}

export async function saveScheduleBatchPg(
  tenantSlug: string,
  externalProdId: number,
  items: {
    date?: string;
    existingParentEventId?: number;
    sceneId: number;
    track?: string;
    startTime: number | string;
    endTime?: string;
    duration?: number;
  }[]
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };
  const prod = await resolveProductionRow(org.id, externalProdId);
  if (!prod) return { success: false as const, error: "Production not found." };

  const db = getDb();
  const sceneRows = await db
    .select()
    .from(schema.scenes)
    .where(and(eq(schema.scenes.organizationId, org.id), eq(schema.scenes.productionId, prod.id)));
  const sceneLookup = new Map<number, number>();
  for (const s of sceneRows) {
    sceneLookup.set(s.id, s.id);
    if (s.baserowId) sceneLookup.set(s.baserowId, s.id);
  }

  const itemsByDate = new Map<string, typeof items>();
  for (const item of items) {
    const key = item.date || "__nodate__";
    const list = itemsByDate.get(key) || [];
    list.push(item);
    itemsByDate.set(key, list);
  }

  for (const [date, dayItems] of itemsByDate.entries()) {
    let internalEventId: number | null = null;
    const requestedEventId = dayItems[0]?.existingParentEventId;
    if (requestedEventId) {
      const existingEvt = await resolveEventRow(org.id, Number(requestedEventId));
      internalEventId = existingEvt?.id ?? null;
    }

    if (!internalEventId && date !== "__nodate__") {
      const numericStarts = dayItems
        .map((i) => (typeof i.startTime === "number" ? i.startTime : null))
        .filter((n): n is number => n !== null);
      const minTime = numericStarts.length > 0 ? Math.min(...numericStarts) : 17;
      const maxTime =
        numericStarts.length > 0
          ? Math.max(
              ...dayItems.map((i) =>
                typeof i.startTime === "number" ? i.startTime + (i.duration || 30) / 60 : minTime + 1
              )
            )
          : 20;

      const [createdEvt] = await db
        .insert(schema.events)
        .values({
          organizationId: org.id,
          productionId: prod.id,
          eventDate: date,
          startTime: `${date}T${formatDecimalHoursToHHMM(minTime)}:00`,
          endTime: `${date}T${formatDecimalHoursToHHMM(maxTime)}:00`,
          eventType: "Rehearsal",
        })
        .returning();
      internalEventId = createdEvt.id;
    }

    for (const item of dayItems) {
      const startIso =
        typeof item.startTime === "number" && date !== "__nodate__"
          ? `${date}T${formatDecimalHoursToHHMM(item.startTime)}:00`
          : typeof item.startTime === "string"
            ? item.startTime
            : new Date(item.startTime).toISOString();

      await db.insert(schema.scheduleSlots).values({
        organizationId: org.id,
        productionId: prod.id,
        eventId: internalEventId,
        sceneId: sceneLookup.get(Number(item.sceneId)) ?? null,
        track: item.track || "Blocking",
        startTime: startIso,
        endTime: item.endTime || null,
        duration: Number(item.duration || 30),
        active: true,
      });
    }
  }

  return { success: true as const };
}

export async function clearSchedulePg(tenantSlug: string, externalProdId: number) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return false;
  const prod = await resolveProductionRow(org.id, externalProdId);
  if (!prod) return false;

  const db = getDb();
  const eventRows = await db
    .select({ id: schema.events.id })
    .from(schema.events)
    .where(and(eq(schema.events.organizationId, org.id), eq(schema.events.productionId, prod.id)));
  const eventIds = eventRows.map((e) => e.id);

  await db
    .delete(schema.scheduleSlots)
    .where(
      eventIds.length > 0
        ? and(
            eq(schema.scheduleSlots.organizationId, org.id),
            or(
              eq(schema.scheduleSlots.productionId, prod.id),
              inArray(schema.scheduleSlots.eventId, eventIds)
            )
          )
        : and(
            eq(schema.scheduleSlots.organizationId, org.id),
            eq(schema.scheduleSlots.productionId, prod.id)
          )
    );
  return true;
}

export async function updateSceneLoadsPg(
  tenantSlug: string,
  updates: { id: number; load: { music: number; dance: number; block: number } }[]
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const db = getDb();
  for (const upd of updates) {
    const scene = await resolveSceneRow(org.id, upd.id);
    if (!scene) continue;
    await db
      .update(schema.scenes)
      .set({
        musicLoad: upd.load.music,
        danceLoad: upd.load.dance,
        blockingLoad: upd.load.block,
      })
      .where(eq(schema.scenes.id, scene.id));
  }
  return { success: true as const };
}

export async function updateSceneStatusPg(
  tenantSlug: string,
  externalSceneId: number,
  field: "music" | "dance" | "block",
  status: string
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const };
  const scene = await resolveSceneRow(org.id, externalSceneId);
  if (!scene) return { success: false as const };

  const db = getDb();
  const patch =
    field === "music"
      ? { musicStatus: status }
      : field === "dance"
        ? { danceStatus: status }
        : { blockingStatus: status };

  await db.update(schema.scenes).set(patch).where(eq(schema.scenes.id, scene.id));
  return { success: true as const };
}

// ==============================================================================
// 🛠️ ASSETS & CONFLICTS
// ==============================================================================

export async function getProductionAssetsPg(tenantSlug: string, externalProdId?: number) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const db = getDb();
  let rows;
  if (externalProdId) {
    const prod = await resolveProductionRow(org.id, externalProdId);
    if (!prod) return [];
    rows = await db
      .select()
      .from(schema.assets)
      .where(and(eq(schema.assets.organizationId, org.id), eq(schema.assets.productionId, prod.id)));
  } else {
    rows = await db
      .select()
      .from(schema.assets)
      .where(eq(schema.assets.organizationId, org.id));
  }

  return rows.map((row) => ({
    id: extId(row),
    name: row.name || "Untitled Asset",
    link: row.url || "#",
    type: row.type || "Prop",
    barcodeSku: row.barcodeSku || null,
  }));
}

export async function createProductionAssetPg(
  tenantSlug: string,
  name: string,
  url: string,
  type: string,
  externalProdId: number
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { error: true, details: "Organization not found." };
  const prod = await resolveProductionRow(org.id, externalProdId);
  if (!prod) return { error: true, details: "Production not found." };

  const db = getDb();
  const [inserted] = await db
    .insert(schema.assets)
    .values({
      organizationId: org.id,
      productionId: prod.id,
      name,
      url,
      type,
    })
    .returning();

  return { id: extId(inserted), name: inserted.name, link: inserted.url, type: inserted.type };
}

export async function getProductionConflictsPg(tenantSlug: string, externalProdId?: number) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const db = getDb();
  let rows;
  if (externalProdId) {
    const prod = await resolveProductionRow(org.id, externalProdId);
    if (!prod) return [];
    rows = await db
      .select()
      .from(schema.conflicts)
      .where(
        and(eq(schema.conflicts.organizationId, org.id), eq(schema.conflicts.productionId, prod.id))
      );
  } else {
    rows = await db
      .select()
      .from(schema.conflicts)
      .where(eq(schema.conflicts.organizationId, org.id));
  }

  const [peopleRows, eventRows] = await Promise.all([
    db.select().from(schema.people).where(eq(schema.people.organizationId, org.id)),
    db.select().from(schema.events).where(eq(schema.events.organizationId, org.id)),
  ]);

  const personMap = new Map(
    peopleRows.map((p) => [p.id, { ext: extId(p), name: personDisplayName(p) }])
  );
  const eventMap = new Map(
    eventRows.map((e) => [e.id, { ext: extId(e), date: e.eventDate || "" }])
  );

  return rows.map((row) => {
    const person = row.personId ? personMap.get(row.personId) : null;
    const evt = row.eventId ? eventMap.get(row.eventId) : null;
    return {
      id: extId(row),
      personId: person?.ext ?? null,
      personName: person?.name || "Unknown Person",
      eventId: evt?.ext ?? null,
      type: row.conflictType || "Absent",
      minutes: row.minutesLateEarly || 0,
      notes: row.notes || "",
      date: evt?.date || "",
    };
  });
}

// ==============================================================================
// 🤝 COMMITTEES & REPORTS
// ==============================================================================

export async function getCommitteeDataPg(tenantSlug: string, externalProdId?: number) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const db = getDb();
  let rows;
  if (externalProdId) {
    const prod = await resolveProductionRow(org.id, externalProdId);
    if (!prod) return [];
    rows = await db
      .select()
      .from(schema.committeePrefs)
      .where(
        and(
          eq(schema.committeePrefs.organizationId, org.id),
          eq(schema.committeePrefs.productionId, prod.id)
        )
      );
  } else {
    rows = await db
      .select()
      .from(schema.committeePrefs)
      .where(eq(schema.committeePrefs.organizationId, org.id));
  }

  const peopleRows = await db
    .select()
    .from(schema.people)
    .where(eq(schema.people.organizationId, org.id));
  const personMap = new Map(peopleRows.map((p) => [p.id, p]));

  return rows.map((row) => {
    const parent = row.parentPersonId ? personMap.get(row.parentPersonId) : null;
    const student = row.studentPersonId ? personMap.get(row.studentPersonId) : null;

    // Fallback: parse manual volunteer notes if parentPersonId is null
    const fallbackName = row.notes?.startsWith("VOLUNTEER:")
      ? row.notes.split("|")[0]?.replace("VOLUNTEER:", "").trim()
      : "";
    const fallbackEmail = row.notes?.includes("EMAIL:")
      ? row.notes.split("EMAIL:")[1]?.split("|")[0]?.trim()
      : "";
    const fallbackPhone = row.notes?.includes("PHONE:")
      ? row.notes.split("PHONE:")[1]?.split("|")[0]?.trim()
      : "";

    const familyId = parent?.familyId ?? student?.familyId ?? null;
    const rawEmail = (parent?.familyEmail || parent?.email || parent?.secondaryEmail || fallbackEmail || "").trim().toLowerCase();
    const lastName = (student?.lastName || parent?.lastName || "").trim().toLowerCase();
    const familyKey = familyId
      ? `fam:${familyId}`
      : rawEmail
        ? `email:${rawEmail}`
        : lastName
          ? `last:${lastName}`
          : `row:${extId(row)}`;

    return {
      id: extId(row),
      name: (parent && personDisplayName(parent)) || fallbackName || "Unknown Parent",
      studentName: (student && personDisplayName(student)) || "Unknown",
      preShow1: row.preShow1 || null,
      preShow2: row.preShow2 || null,
      preShow3: row.preShow3 || null,
      showWeek1: row.showWeek1 || null,
      showWeek2: row.showWeek2 || null,
      showWeek3: row.showWeek3 || null,
      chairInterest: Array.isArray(row.chairInterest) ? row.chairInterest : [],
      notes: row.notes || "",
      familyKey,
      email: parent?.email || parent?.secondaryEmail || fallbackEmail || "",
      phone: parent?.phone || fallbackPhone || "",
      assignedPreShow: row.assignedPreShow || null,
      assignedShowWeek: row.assignedShowWeek || null,
      isChair: Boolean(row.isChair),
    };
  });
}

export async function submitCommitteeReportPg(tenantSlug: string, data: any) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const prod = data.productionId ? await resolveProductionRow(org.id, Number(data.productionId)) : null;
  const submitter = data.submitterId ? await resolvePersonRow(org.id, Number(data.submitterId)) : null;

  const db = getDb();
  const [inserted] = await db
    .insert(schema.committeeReports)
    .values({
      organizationId: org.id,
      productionId: prod?.id ?? null,
      submitterId: submitter?.id ?? null,
      name: `${data.committeeName} - ${data.phase} Report`,
      committeeName: data.committeeName || "Unassigned",
      reportDate: new Date().toISOString().split("T")[0],
      productionPhase: data.phase || "Pre-Show",
      progressUpdate: data.progressUpdate || "",
      attendanceNotes: data.attendanceNotes || "",
      blockersAndNeeds: data.blockers || "",
      estimatedCompletion: parseInt(data.completion) || 0,
      moneySpentThisWeek: parseFloat(data.moneySpent) || 0,
    })
    .returning();

  return { success: true as const, id: extId(inserted) };
}

export async function getCommitteeReportsPg(tenantSlug: string, externalProdId: number) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;
  const prod = await resolveProductionRow(org.id, externalProdId);
  if (!prod) return [];

  const db = getDb();
  const [rows, peopleRows] = await Promise.all([
    db
      .select()
      .from(schema.committeeReports)
      .where(
        and(
          eq(schema.committeeReports.organizationId, org.id),
          eq(schema.committeeReports.productionId, prod.id)
        )
      ),
    db.select().from(schema.people).where(eq(schema.people.organizationId, org.id)),
  ]);
  const personMap = new Map(peopleRows.map((p) => [p.id, personDisplayName(p)]));

  return rows
    .map((r) => ({
      id: extId(r),
      name: r.name || "Untitled",
      committee: r.committeeName || "Unassigned",
      phase: r.productionPhase || "Unknown",
      date: r.reportDate || "No Date",
      progress: r.progressUpdate || "",
      attendance: r.attendanceNotes || "",
      blockers: r.blockersAndNeeds || "",
      completion: r.estimatedCompletion || 0,
      moneySpent: Number(r.moneySpentThisWeek || 0),
      submitter: (r.submitterId && personMap.get(r.submitterId)) || "Unknown Chair",
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function saveCommitteeAssignmentsPg(
  tenantSlug: string,
  phase: "Pre-Show" | "Show Week",
  assignmentsMap: Record<number, string>,
  chairs: Record<number, boolean>
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const db = getDb();
  for (const [idStr, value] of Object.entries(assignmentsMap)) {
    const extRowId = Number(idStr);
    const [existing] = await db
      .select()
      .from(schema.committeePrefs)
      .where(
        and(
          eq(schema.committeePrefs.organizationId, org.id),
          or(
            eq(schema.committeePrefs.baserowId, extRowId),
            eq(schema.committeePrefs.id, extRowId)
          )
        )
      )
      .limit(1);
    if (!existing) continue;

    const assignedValue = value === "Unassigned" ? null : value;
    await db
      .update(schema.committeePrefs)
      .set({
        ...(phase === "Pre-Show"
          ? { assignedPreShow: assignedValue }
          : { assignedShowWeek: assignedValue }),
        isChair: Boolean(chairs[extRowId]),
      })
      .where(eq(schema.committeePrefs.id, existing.id));
  }

  return { success: true as const };
}

export async function addCommitteeVolunteerPg(
  tenantSlug: string,
  data: { name: string; email: string; phone: string }
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const db = getDb();
  let parentPersonId: number | null = null;
  if (data.email?.trim()) {
    const cleanEmail = data.email.trim().toLowerCase();
    const [existingPerson] = await db
      .select()
      .from(schema.people)
      .where(
        and(
          eq(schema.people.organizationId, org.id),
          or(eq(schema.people.email, cleanEmail), eq(schema.people.secondaryEmail, cleanEmail))
        )
      )
      .limit(1);
    if (existingPerson) {
      parentPersonId = existingPerson.id;
    } else {
      const parts = data.name.trim().split(/\s+/);
      const [created] = await db
        .insert(schema.people)
        .values({
          organizationId: org.id,
          firstName: parts[0] || "Volunteer",
          lastName: parts.slice(1).join(" "),
          fullName: data.name.trim(),
          email: cleanEmail,
          phone: data.phone || null,
          roles: ["Committee Team"],
        })
        .returning();
      parentPersonId = created.id;
    }
  }

  await db.insert(schema.committeePrefs).values({
    organizationId: org.id,
    parentPersonId,
    notes: `VOLUNTEER:${data.name.trim()}|EMAIL:${data.email || ""}|PHONE:${data.phone || ""}`,
  });

  return { success: true as const };
}

export async function updateCommitteeVolunteerPg(
  tenantSlug: string,
  externalRowId: number,
  data: { name: string; email: string; phone: string }
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const db = getDb();
  const [existing] = await db
    .select()
    .from(schema.committeePrefs)
    .where(
      and(
        eq(schema.committeePrefs.organizationId, org.id),
        or(
          eq(schema.committeePrefs.baserowId, externalRowId),
          eq(schema.committeePrefs.id, externalRowId)
        )
      )
    )
    .limit(1);

  if (!existing) return { success: false as const, error: "Volunteer row not found." };

  if (existing.parentPersonId) {
    const parts = data.name.trim().split(/\s+/);
    await db
      .update(schema.people)
      .set({
        firstName: parts[0] || "Volunteer",
        lastName: parts.slice(1).join(" "),
        fullName: data.name.trim(),
        email: data.email?.trim().toLowerCase() || null,
        phone: data.phone || null,
        updatedAt: new Date(),
      })
      .where(eq(schema.people.id, existing.parentPersonId));
  }

  await db
    .update(schema.committeePrefs)
    .set({
      notes: `VOLUNTEER:${data.name.trim()}|EMAIL:${data.email || ""}|PHONE:${data.phone || ""}`,
    })
    .where(eq(schema.committeePrefs.id, existing.id));

  return { success: true as const };
}

export async function deleteCommitteeVolunteerPg(tenantSlug: string, externalRowId: number) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const db = getDb();
  await db
    .delete(schema.committeePrefs)
    .where(
      and(
        eq(schema.committeePrefs.organizationId, org.id),
        or(
          eq(schema.committeePrefs.baserowId, externalRowId),
          eq(schema.committeePrefs.id, externalRowId)
        )
      )
    );
  return { success: true as const };
}

// ==============================================================================
// 📋 ATTENDANCE & NIGHTLY REPORTS
// ==============================================================================

export async function toggleAttendancePg(
  tenantSlug: string,
  externalProdId: number,
  externalPersonId: number,
  externalEventId: number,
  action: "IN" | "OUT" | "ABSENT"
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };

  const [prod, person, evt] = await Promise.all([
    resolveProductionRow(org.id, externalProdId),
    resolvePersonRow(org.id, externalPersonId),
    resolveEventRow(org.id, externalEventId),
  ]);

  if (!person || !evt) {
    return { success: false as const, error: "Person or event not found." };
  }

  const db = getDb();
  const [existing] = await db
    .select()
    .from(schema.attendance)
    .where(
      and(
        eq(schema.attendance.organizationId, org.id),
        eq(schema.attendance.personId, person.id),
        eq(schema.attendance.eventId, evt.id)
      )
    )
    .limit(1);

  const now = new Date().toISOString();
  const patch: Partial<typeof schema.attendance.$inferInsert> =
    action === "IN"
      ? { checkInTime: now, status: "Present" }
      : action === "OUT"
        ? { checkOutTime: now }
        : { status: "Unexcused Absence" };

  if (existing) {
    const [updated] = await db
      .update(schema.attendance)
      .set(patch)
      .where(eq(schema.attendance.id, existing.id))
      .returning();
    return { success: true as const, data: updated };
  }

  const [inserted] = await db
    .insert(schema.attendance)
    .values({
      organizationId: org.id,
      productionId: prod?.id ?? null,
      personId: person.id,
      eventId: evt.id,
      ...patch,
    })
    .returning();

  return { success: true as const, data: inserted };
}

export async function getAttendanceForEventPg(tenantSlug: string, externalEventId: number) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;
  const evt = await resolveEventRow(org.id, externalEventId);
  if (!evt) return [];

  const db = getDb();
  const [rows, peopleRows] = await Promise.all([
    db
      .select()
      .from(schema.attendance)
      .where(
        and(eq(schema.attendance.organizationId, org.id), eq(schema.attendance.eventId, evt.id))
      ),
    db.select().from(schema.people).where(eq(schema.people.organizationId, org.id)),
  ]);
  const personMap = new Map(
    peopleRows.map((p) => [p.id, { ext: extId(p), name: personDisplayName(p) }])
  );

  return rows.map((r) => {
    const person = r.personId ? personMap.get(r.personId) : null;
    return {
      personId: person?.ext ?? null,
      name: person?.name || "Unknown",
      checkIn: r.checkInTime || null,
      checkOut: r.checkOutTime || null,
      status: r.status || "Present",
    };
  });
}

export async function getScheduledSceneNamesForEventPg(
  tenantSlug: string,
  externalEventId: number
): Promise<string[] | null> {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;
  const evt = await resolveEventRow(org.id, externalEventId);
  if (!evt) return [];

  const db = getDb();
  const rows = await db
    .select({ sceneName: schema.scenes.sceneName })
    .from(schema.scheduleSlots)
    .innerJoin(schema.scenes, eq(schema.scheduleSlots.sceneId, schema.scenes.id))
    .where(
      and(
        eq(schema.scheduleSlots.organizationId, org.id),
        eq(schema.scheduleSlots.eventId, evt.id)
      )
    );

  return Array.from(new Set(rows.map((r) => r.sceneName).filter(Boolean)));
}

// ==============================================================================
// 📊 ANALYTICS, DEMOGRAPHICS & BASEROWCLIENT PARITY
// ==============================================================================

export async function getPerformanceAnalyticsPg(tenantSlug: string) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const db = getDb();
  const [perfRows, prodRows] = await Promise.all([
    db.select().from(schema.performances).where(eq(schema.performances.organizationId, org.id)),
    db.select().from(schema.productions).where(eq(schema.productions.organizationId, org.id)),
  ]);
  const prodExtMap = new Map(prodRows.map((p) => [p.id, p.id]));

  return perfRows.map((row) => {
    const sold = Number(row.ticketsSold || 0);
    const capacity = Number(row.totalInventory || 0);
    return {
      productionId: (row.productionId && prodExtMap.get(row.productionId)) ?? null,
      name: row.label || "Show",
      sold,
      capacity,
      empty: Math.max(0, capacity - sold),
      fillRate: capacity > 0 ? Math.round((sold / capacity) * 100) : 0,
    };
  });
}

export async function getPerformancesClientPg(tenantSlug: string) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const db = getDb();
  const [perfRows, prodRows] = await Promise.all([
    db.select().from(schema.performances).where(eq(schema.performances.organizationId, org.id)),
    db.select().from(schema.productions).where(eq(schema.productions.organizationId, org.id)),
  ]);
  const prodMap = new Map(prodRows.map((p) => [p.id, { id: p.id, value: p.title }]));

  return perfRows.map((row) => ({
    id: extId(row),
    Performance: row.label || "Show",
    "Performance Date": row.performanceDate || null,
    "Tickets Sold": row.ticketsSold || 0,
    "Total Inventory": row.totalInventory || 0,
    Production: row.productionId && prodMap.get(row.productionId) ? [prodMap.get(row.productionId)] : [],
  }));
}

export async function getAllProductionsClientPg(tenantSlug: string) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const db = getDb();
  const [prodRows, venueRows, sessionRows] = await Promise.all([
    db.select().from(schema.productions).where(eq(schema.productions.organizationId, org.id)),
    db.select().from(schema.venues).where(eq(schema.venues.organizationId, org.id)),
    db.select().from(schema.sessions).where(eq(schema.sessions.organizationId, org.id)),
  ]);
  const venueMap = new Map(venueRows.map((v) => [v.id, { id: extId(v), value: v.name }]));
  const sessionMap = new Map(sessionRows.map((s) => [s.id, s.name]));

  return prodRows.map((p) => {
    const venue = p.venueId ? venueMap.get(p.venueId) : null;
    const sessionName = (p.sessionId && sessionMap.get(p.sessionId)) || p.sessionLabel || "Other";
    return {
      id: extId(p),
      Title: p.title,
      Type: p.type ? { value: p.type } : null,
      Status: p.status ? { value: p.status } : null,
      Session: { value: sessionName },
      Venue: venue ? [venue] : [],
      Performances: p.legacyPerformancesJson || "",
    };
  });
}

export async function getAllVenuesClientPg(tenantSlug: string) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const db = getDb();
  const rows = await db
    .select()
    .from(schema.venues)
    .where(eq(schema.venues.organizationId, org.id));

  return rows.map((v) => ({
    id: extId(v),
    "Venue Name": v.name,
    "Seating Capacity": v.seatingCapacity || 0,
    "Public Name (Marketing)": v.marketingName || null,
    Type: v.type ? { value: v.type } : null,
  }));
}

export async function getAllSeasonsClientPg(tenantSlug: string) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const db = getDb();
  const [sessionRows, seasonRows] = await Promise.all([
    db.select().from(schema.sessions).where(eq(schema.sessions.organizationId, org.id)),
    db.select().from(schema.seasons).where(eq(schema.seasons.organizationId, org.id)),
  ]);

  // Analytics maps 'Session Name' + 'Start Date'; include both sessions and seasons cleanly
  const source = sessionRows.length > 0 ? sessionRows : seasonRows;
  return source.map((s) => ({
    id: extId(s),
    "Session Name": s.name,
    Name: s.name,
    "Start Date": s.startDate || null,
    "End Date": s.endDate || null,
  }));
}

export async function getCastDemographicsPg(tenantSlug: string) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const db = getDb();
  const [peopleRows, assignmentRows] = await Promise.all([
    db.select().from(schema.people).where(eq(schema.people.organizationId, org.id)).limit(500),
    db
      .select({ personId: schema.assignments.personId })
      .from(schema.assignments)
      .where(eq(schema.assignments.organizationId, org.id)),
  ]);

  const counts = new Map<number, number>();
  for (const a of assignmentRows) {
    if (a.personId) counts.set(a.personId, (counts.get(a.personId) || 0) + 1);
  }

  return peopleRows.map((p) => ({
    id: extId(p),
    name: personDisplayName(p),
    age: computeAgeFromDob(p.dateOfBirth),
    height: p.heightInches || 0,
    showCount: counts.get(p.id) || 0,
    gender: p.gender || "Unknown",
  }));
}

export async function getComplianceDataPg(tenantSlug: string, externalProdId?: number) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const db = getDb();

  if (externalProdId && externalProdId > 0) {
    const prod = await resolveProductionRow(org.id, externalProdId);
    if (!prod) return [];

    const [audRows, assignRows, sigRows, commRows] = await Promise.all([
      db
        .select()
        .from(schema.auditions)
        .where(
          and(
            eq(schema.auditions.organizationId, org.id),
            eq(schema.auditions.productionId, prod.id)
          )
        ),
      db
        .select({ personId: schema.assignments.personId })
        .from(schema.assignments)
        .where(
          and(
            eq(schema.assignments.organizationId, org.id),
            eq(schema.assignments.productionId, prod.id)
          )
        ),
      db
        .select({ personId: schema.signatures.personId, docType: schema.signatures.docType })
        .from(schema.signatures)
        .where(
          and(
            eq(schema.signatures.organizationId, org.id),
            eq(schema.signatures.productionId, prod.id)
          )
        ),
      db
        .select({
          studentPersonId: schema.committeePrefs.studentPersonId,
          assignedPreShow: schema.committeePrefs.assignedPreShow,
          assignedShowWeek: schema.committeePrefs.assignedShowWeek,
        })
        .from(schema.committeePrefs)
        .where(
          and(
            eq(schema.committeePrefs.organizationId, org.id),
            eq(schema.committeePrefs.productionId, prod.id)
          )
        ),
    ]);

    const personIds = Array.from(
      new Set([
        ...audRows.map((a) => a.performerId).filter((id): id is number => id != null),
        ...assignRows.map((a) => a.personId).filter((id): id is number => id != null),
      ])
    );
    if (personIds.length === 0) return [];

    const peopleRows = await db
      .select()
      .from(schema.people)
      .where(and(eq(schema.people.organizationId, org.id), inArray(schema.people.id, personIds)));

    const audByPerson = new Map(
      audRows.filter((a) => a.performerId != null).map((a) => [a.performerId!, a])
    );
    const sigsByPerson = new Map<number, string[]>();
    for (const s of sigRows) {
      if (!s.personId || !s.docType) continue;
      const list = sigsByPerson.get(s.personId) || [];
      list.push(s.docType);
      sigsByPerson.set(s.personId, list);
    }
    const commByStudent = new Map<number, { pre: string | null; show: string | null }>();
    for (const c of commRows) {
      if (!c.studentPersonId) continue;
      commByStudent.set(c.studentPersonId, {
        pre: c.assignedPreShow || null,
        show: c.assignedShowWeek || null,
      });
    }

    return peopleRows.map((p) => {
      const aud = audByPerson.get(p.id);
      const docs = sigsByPerson.get(p.id) || [];
      const comm = commByStudent.get(p.id);
      return {
        id: extId(p),
        internalId: p.id,
        name: personDisplayName(p),
        email: p.email || p.secondaryEmail || "",
        roles: p.roles || [],
        headshot: p.headshotUrl || null,
        paidFees: Boolean(aud?.paidFees),
        measurementsTaken: Boolean(aud?.measurementsTaken),
        hasBio: Boolean(aud?.programBio && aud.programBio.trim().length > 10),
        signedDocs: docs,
        hasCommittee: Boolean(comm),
        committeeName: comm?.pre || comm?.show || "Unassigned",
      };
    });
  }

  const rows = await db
    .select()
    .from(schema.people)
    .where(eq(schema.people.organizationId, org.id))
    .limit(500);

  return rows.map((p) => ({
    id: extId(p),
    name: personDisplayName(p),
    email: p.email || p.secondaryEmail || "",
    roles: p.roles || [],
    headshot: p.headshotUrl || null,
  }));
}

// ==============================================================================
// 🎭 BASEROWCLIENT CASTING & ROSTER PARITY
// ==============================================================================

export async function getProductionClientPg(tenantSlug: string, externalProdId: number) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;
  const prod = await resolveProductionRow(org.id, externalProdId);
  if (!prod) return null;
  return { id: prod.id, title: prod.title || "Unknown Show" };
}

export async function getRosterForShowClientPg(tenantSlug: string, externalProdId: number) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;
  const prod = await resolveProductionRow(org.id, externalProdId);
  if (!prod) return [];

  const db = getDb();
  const [audRows, peopleRows] = await Promise.all([
    db
      .select()
      .from(schema.auditions)
      .where(
        and(
          eq(schema.auditions.organizationId, org.id),
          eq(schema.auditions.productionId, prod.id)
        )
      ),
    db.select().from(schema.people).where(eq(schema.people.organizationId, org.id)),
  ]);
  const personMap = new Map(peopleRows.map((p) => [p.id, p]));

  return audRows.map((aud) => {
    const person = aud.performerId ? personMap.get(aud.performerId) : null;
    const personExt = person ? extId(person) : extId(aud);
    const name = person ? personDisplayName(person) : "Unknown Actor";
    const hasHeadshot = Boolean(person?.headshotUrl);
    const avatarUrl =
      person?.headshotUrl || "https://placehold.co/150x150/222/888?text=Actor";

    return {
      id: personExt,
      auditionId: extId(aud),
      name,
      avatar: avatarUrl,
      headshotUrl: avatarUrl,
      status: aud.status || "Pending",
      vocalScore: aud.vocalScore || 0,
      actingScore: aud.actingScore || 0,
      danceScore: aud.danceScore || 0,
      auditionInfo: { gender: person?.gender || null },
      auditionGrades: {
        vocal: aud.vocalScore ?? null,
        acting: aud.actingScore ?? null,
        dance: aud.danceScore ?? null,
      },
      paidFees: Boolean(aud.paidFees),
      measurementsTaken: Boolean(aud.measurementsTaken),
      signedAgreement: Boolean(aud.commitmentToCharacter),
      headshotSubmitted: hasHeadshot,
      grade: aud.grade || "",
      height: person?.heightInches ? formatHeightFromInches(person.heightInches) : "",
      hairColor: aud.hairColor || "",
      songTitle: aud.song || "",
      musicFileUrl: aud.backingTrackUrl || "",
      practiceAudio: aud.backingTrackUrl || "",
      acceptAnyRole: Boolean(aud.acceptAnyRole),
      willingToAlterAppearance: Boolean(aud.willingToAlterAppearance),
      fearOfHeights: Boolean(aud.fearOfHeights),
      stageRomance: Boolean(aud.stageRomance),
      otherTalents: aud.otherTalents || "",
      preferredRoles: aud.preferredRoles || "",
      voiceType: aud.voiceType || "",
      conflicts: "",
    };
  });
}

export async function getRolesForShowClientPg(tenantSlug: string, externalShowOrProdId: number) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const db = getDb();
  const prod = await resolveProductionRow(org.id, externalShowOrProdId);
  let masterShowId = prod?.masterShowId ?? null;

  if (!masterShowId) {
    const [ms] = await db
      .select()
      .from(schema.masterShows)
      .where(
        and(
          eq(schema.masterShows.organizationId, org.id),
          or(
            eq(schema.masterShows.baserowId, externalShowOrProdId),
            eq(schema.masterShows.id, externalShowOrProdId)
          )
        )
      )
      .limit(1);
    masterShowId = ms?.id ?? null;
  }

  if (!masterShowId) return [];

  const [roleRows, sceneRows] = await Promise.all([
    db
      .select()
      .from(schema.blueprintRoles)
      .where(
        and(
          eq(schema.blueprintRoles.organizationId, org.id),
          eq(schema.blueprintRoles.masterShowId, masterShowId)
        )
      )
      .orderBy(asc(schema.blueprintRoles.roleName)),
    prod
      ? db
          .select()
          .from(schema.scenes)
          .where(
            and(eq(schema.scenes.organizationId, org.id), eq(schema.scenes.productionId, prod.id))
          )
      : Promise.resolve([]),
  ]);

  return roleRows.map((role) => {
    const roleExt = extId(role);
    const activeScenes = sceneRows
      .filter(
        (s) =>
          (s.blueprintRoleIds || []).includes(role.id) ||
          (s.blueprintRoleIds || []).includes(roleExt)
      )
      .map((s) => ({ id: extId(s), value: s.sceneName }));

    return {
      id: roleExt,
      name: role.roleName || "Unnamed Role",
      type: role.roleType || "Role",
      activeScenes,
      vocalRequirements: parseRangeString(role.vocalRange || ""),
    };
  });
}

export async function getAssignmentsForShowClientPg(tenantSlug: string, externalProdId: number) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;
  const prod = await resolveProductionRow(org.id, externalProdId);
  if (!prod) return [];

  const db = getDb();
  const [assignRows, roleRows, peopleRows, sceneAssignRows, sceneRows] = await Promise.all([
    db
      .select()
      .from(schema.assignments)
      .where(
        and(
          eq(schema.assignments.organizationId, org.id),
          eq(schema.assignments.productionId, prod.id)
        )
      ),
    db
      .select()
      .from(schema.blueprintRoles)
      .where(eq(schema.blueprintRoles.organizationId, org.id)),
    db.select().from(schema.people).where(eq(schema.people.organizationId, org.id)),
    db
      .select()
      .from(schema.sceneAssignments)
      .where(
        and(
          eq(schema.sceneAssignments.organizationId, org.id),
          eq(schema.sceneAssignments.productionId, prod.id)
        )
      ),
    db
      .select()
      .from(schema.scenes)
      .where(and(eq(schema.scenes.organizationId, org.id), eq(schema.scenes.productionId, prod.id))),
  ]);

  const roleMap = new Map(roleRows.map((r) => [r.id, { id: extId(r), value: r.roleName }]));
  const personMap = new Map(
    peopleRows.map((p) => [p.id, { id: extId(p), value: personDisplayName(p) }])
  );
  const sceneMap = new Map(sceneRows.map((s) => [s.id, { id: extId(s), value: s.sceneName }]));

  const scenesByPerson = new Map<number, { id: number; value: string }[]>();
  for (const sa of sceneAssignRows) {
    if (!sa.personId || !sa.sceneId) continue;
    const sc = sceneMap.get(sa.sceneId);
    if (!sc) continue;
    const list = scenesByPerson.get(sa.personId) || [];
    if (!list.some((x) => x.id === sc.id)) list.push(sc);
    scenesByPerson.set(sa.personId, list);
  }

  return assignRows.map((a) => ({
    id: extId(a),
    role: a.roleId && roleMap.get(a.roleId) ? [roleMap.get(a.roleId)!] : [],
    person: a.personId && personMap.get(a.personId) ? [personMap.get(a.personId)!] : [],
    production: [{ id: extId(prod), value: prod.title }],
    savedScenes: a.personId ? scenesByPerson.get(a.personId) || [] : [],
    _pendingScenes: null,
  }));
}

// ==============================================================================
// 🎛️ WORKFLOW, CASTING GRID, PLAYBILL, ROSTER ACTIONS, CHECKOUT & SEASON BOARD
// ==============================================================================

export async function toggleWorkflowTagPg(
  tenantSlug: string,
  externalProdId: number,
  targetTag: string
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const };
  const prod = await resolveProductionRow(org.id, externalProdId);
  if (!prod) return { success: false as const };

  const current = Array.isArray(prod.workflowOverrides) ? prod.workflowOverrides : [];
  const next = current.includes(targetTag)
    ? current.filter((v) => v !== targetTag)
    : [...current, targetTag];

  const db = getDb();
  await db
    .update(schema.productions)
    .set({ workflowOverrides: next, updatedAt: new Date() })
    .where(eq(schema.productions.id, prod.id));

  return { success: true as const, workflowOverrides: next };
}

export async function saveCastingGridPg(
  tenantSlug: string,
  externalProdId: number,
  actorChanges: { assignmentId: number; studentIds: number[] }[],
  sceneChanges: { assignmentId: number; addedSceneIds: number[]; removedSceneIds: number[] }[],
  deletedRowIds: number[] = [],
  createdRows: { assignedStudentIds?: number[] }[] = []
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };
  const prod = await resolveProductionRow(org.id, externalProdId);
  if (!prod) return { success: false as const, error: "Production not found." };

  const db = getDb();

  // 1. Deletions
  for (const delId of deletedRowIds) {
    const existing = await resolveAssignmentRow(org.id, delId);
    if (existing) {
      await db.delete(schema.assignments).where(eq(schema.assignments.id, existing.id));
    }
  }

  // 2. Created rows
  for (const row of createdRows) {
    const firstStudentExt = row.assignedStudentIds?.[0];
    const person = firstStudentExt ? await resolvePersonRow(org.id, firstStudentExt) : null;
    await db.insert(schema.assignments).values({
      organizationId: org.id,
      productionId: prod.id,
      personId: person?.id ?? null,
    });
  }

  // 3. Actor updates
  for (const change of actorChanges) {
    const assign = await resolveAssignmentRow(org.id, change.assignmentId);
    if (!assign) continue;
    const firstStudentExt = change.studentIds?.[0];
    const person = firstStudentExt ? await resolvePersonRow(org.id, firstStudentExt) : null;
    await db
      .update(schema.assignments)
      .set({ personId: person?.id ?? null, updatedAt: new Date() })
      .where(eq(schema.assignments.id, assign.id));
  }

  // 4. Scene assignment updates
  for (const change of sceneChanges) {
    const assign = await resolveAssignmentRow(org.id, change.assignmentId);
    const actorUpdate = actorChanges.find((a) => a.assignmentId === change.assignmentId);
    const studentExtIds =
      actorUpdate?.studentIds ?? (assign?.personId ? [assign.personId] : []);

    for (const sid of studentExtIds) {
      const person =
        actorUpdate?.studentIds
          ? await resolvePersonRow(org.id, sid)
          : assign?.personId
            ? { id: assign.personId }
            : null;
      if (!person) continue;

      for (const sceneExtId of change.addedSceneIds || []) {
        const scene = await resolveSceneRow(org.id, sceneExtId);
        if (!scene) continue;
        const [exists] = await db
          .select({ id: schema.sceneAssignments.id })
          .from(schema.sceneAssignments)
          .where(
            and(
              eq(schema.sceneAssignments.organizationId, org.id),
              eq(schema.sceneAssignments.productionId, prod.id),
              eq(schema.sceneAssignments.personId, person.id),
              eq(schema.sceneAssignments.sceneId, scene.id)
            )
          )
          .limit(1);
        if (!exists) {
          await db.insert(schema.sceneAssignments).values({
            organizationId: org.id,
            productionId: prod.id,
            personId: person.id,
            sceneId: scene.id,
            assignmentId: assign?.id ?? null,
          });
        }
      }

      for (const sceneExtId of change.removedSceneIds || []) {
        const scene = await resolveSceneRow(org.id, sceneExtId);
        if (!scene) continue;
        await db
          .delete(schema.sceneAssignments)
          .where(
            and(
              eq(schema.sceneAssignments.organizationId, org.id),
              eq(schema.sceneAssignments.productionId, prod.id),
              eq(schema.sceneAssignments.personId, person.id),
              eq(schema.sceneAssignments.sceneId, scene.id)
            )
          );
      }
    }
  }

  return { success: true as const };
}

export async function clearCastingDataPg(tenantSlug: string, externalProdId: number) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return { success: false as const, error: "Organization not found." };
  const prod = await resolveProductionRow(org.id, externalProdId);
  if (!prod) return { success: false as const, error: "Production not found." };

  const db = getDb();
  await db
    .delete(schema.sceneAssignments)
    .where(
      and(
        eq(schema.sceneAssignments.organizationId, org.id),
        eq(schema.sceneAssignments.productionId, prod.id)
      )
    );
  await db
    .delete(schema.assignments)
    .where(
      and(
        eq(schema.assignments.organizationId, org.id),
        eq(schema.assignments.productionId, prod.id)
      )
    );

  return { success: true as const };
}

export async function getPlaybillDataPg(tenantSlug: string, externalProdId: number) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;
  const prod = await resolveProductionRow(org.id, externalProdId);
  if (!prod) return [];

  const db = getDb();
  const [audRows, assignRows, roleRows, peopleRows] = await Promise.all([
    db
      .select()
      .from(schema.auditions)
      .where(
        and(
          eq(schema.auditions.organizationId, org.id),
          eq(schema.auditions.productionId, prod.id),
          eq(schema.auditions.status, "Cast")
        )
      ),
    db
      .select()
      .from(schema.assignments)
      .where(
        and(
          eq(schema.assignments.organizationId, org.id),
          eq(schema.assignments.productionId, prod.id)
        )
      ),
    db.select().from(schema.blueprintRoles).where(eq(schema.blueprintRoles.organizationId, org.id)),
    db.select().from(schema.people).where(eq(schema.people.organizationId, org.id)),
  ]);

  const roleMap = new Map(roleRows.map((r) => [r.id, r.roleName]));
  const personMap = new Map(peopleRows.map((p) => [p.id, personDisplayName(p)]));
  const roleByPerson = new Map<number, string>();
  for (const a of assignRows) {
    if (a.personId && a.roleId && roleMap.has(a.roleId)) {
      roleByPerson.set(a.personId, roleMap.get(a.roleId)!);
    }
  }

  return audRows
    .map((aud) => ({
      id: extId(aud),
      name: (aud.performerId && personMap.get(aud.performerId)) || "Unknown Actor",
      role: (aud.performerId && roleByPerson.get(aud.performerId)) || "Ensemble",
      bio: aud.programBio || "",
      ad: aud.congratsAdText || "",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function changeAuditionTimeSlotPg(
  tenantSlug: string,
  externalProdId: number,
  externalAuditionId: number,
  newSlotLabel: string
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return false;
  const prod = await resolveProductionRow(org.id, externalProdId);
  const aud = await resolveAuditionRow(org.id, externalAuditionId);
  if (!prod || !aud) return false;

  const db = getDb();
  const [slot] = await db
    .select()
    .from(schema.auditionSlots)
    .where(
      and(
        eq(schema.auditionSlots.organizationId, org.id),
        eq(schema.auditionSlots.productionId, prod.id),
        ilike(schema.auditionSlots.timeLabel, newSlotLabel.trim())
      )
    )
    .limit(1);

  if (slot) {
    await db
      .update(schema.auditions)
      .set({ slotId: slot.id, updatedAt: new Date() })
      .where(eq(schema.auditions.id, aud.id));
  } else {
    const notes = aud.adminNotes || "";
    await db
      .update(schema.auditions)
      .set({
        adminNotes: `${notes}\n\n[SYSTEM]: Tried to move actor to slot '${newSlotLabel}' but no matching slot was found in the database.`,
        updatedAt: new Date(),
      })
      .where(eq(schema.auditions.id, aud.id));
  }
  return true;
}

export async function assignMissingAuditionNumbersPg(tenantSlug: string, externalProdId: number) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return false;
  const prod = await resolveProductionRow(org.id, externalProdId);
  if (!prod) return false;

  const db = getDb();
  const rows = await db
    .select()
    .from(schema.auditions)
    .where(
      and(eq(schema.auditions.organizationId, org.id), eq(schema.auditions.productionId, prod.id))
    );

  const existingNumbers = new Set<number>();
  const missing: (typeof rows)[number][] = [];

  for (const row of rows) {
    const numStr = row.auditionNumber?.trim();
    if (numStr && numStr !== "N/A") {
      const parsed = parseInt(numStr, 10);
      if (!Number.isNaN(parsed)) existingNumbers.add(parsed);
      else missing.push(row);
    } else {
      missing.push(row);
    }
  }

  if (missing.length === 0) return true;

  const available: number[] = [];
  for (let i = 1; i <= Math.max(200, rows.length + 50); i++) {
    if (!existingNumbers.has(i)) available.push(i);
  }
  available.sort(() => Math.random() - 0.5);

  for (let idx = 0; idx < missing.length; idx++) {
    await db
      .update(schema.auditions)
      .set({ auditionNumber: String(available[idx]), updatedAt: new Date() })
      .where(eq(schema.auditions.id, missing[idx].id));
  }
  return true;
}

export async function getCheckoutDetailsPg(
  tenantSlug: string,
  externalProdId: number,
  externalAuditionId: number
) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const [prod, aud] = await Promise.all([
    resolveProductionRow(org.id, externalProdId),
    resolveAuditionRow(org.id, externalAuditionId),
  ]);

  if (!prod) return { error: "Production not found.", status: 404 as const };
  if (!aud) return { error: "Audition record not found.", status: 404 as const };

  let studentName = "Cast Member";
  let studentId = "";
  if (aud.performerId) {
    const db = getDb();
    const [person] = await db
      .select()
      .from(schema.people)
      .where(eq(schema.people.id, aud.performerId))
      .limit(1);
    if (person) {
      studentName = personDisplayName(person);
      studentId = String(extId(person));
    }
  }

  return {
    error: null,
    status: 200 as const,
    showTitle: prod.title || "Production",
    productionFeeDollars: Number(prod.productionFee ?? 0),
    paidFees: Boolean(aud.paidFees),
    studentName,
    studentId,
  };
}

export async function getSeasonBoardPg(tenantSlug: string, externalSeasonId: number) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return null;

  const db = getDb();
  const [season] = await db
    .select()
    .from(schema.seasons)
    .where(
      and(
        eq(schema.seasons.organizationId, org.id),
        or(eq(schema.seasons.baserowId, externalSeasonId), eq(schema.seasons.id, externalSeasonId))
      )
    )
    .limit(1);

  if (!season) return null;

  const [interestRows, prodRows] = await Promise.all([
    db
      .select()
      .from(schema.staffInterest)
      .where(
        and(
          eq(schema.staffInterest.organizationId, org.id),
          eq(schema.staffInterest.seasonId, season.id)
        )
      ),
    db
      .select()
      .from(schema.productions)
      .where(
        and(
          eq(schema.productions.organizationId, org.id),
          eq(schema.productions.seasonId, season.id)
        )
      ),
  ]);

  return {
    season: {
      id: extId(season),
      Name: season.name,
      "Start Date": season.startDate,
      "End Date": season.endDate,
      Status: season.status ? { value: season.status } : null,
    },
    talentPool: interestRows.map((r) => ({
      id: extId(r),
      Name: r.name,
      Constraints: r.constraints || "",
      Availability: r.availability || {},
    })),
    productions: prodRows.map((p) => ({
      id: extId(p),
      Title: p.title,
      Status: p.status ? { value: p.status } : null,
      Type: p.type ? { value: p.type } : null,
    })),
  };
}

export async function deleteRowPg(tenantSlug: string, tableKey: string, externalRowId: number) {
  const org = await getOrganizationBySlugPg(tenantSlug);
  if (!org) return false;
  const db = getDb();

  const tableMap: Record<string, any> = {
    PEOPLE: schema.people,
    PRODUCTIONS: schema.productions,
    AUDITIONS: schema.auditions,
    AUDITION_SLOTS: schema.auditionSlots,
    ASSIGNMENTS: schema.assignments,
    SCENES: schema.scenes,
    SCENE_ASSIGNMENTS: schema.sceneAssignments,
    EVENTS: schema.events,
    SCHEDULE_SLOTS: schema.scheduleSlots,
    CONFLICTS: schema.conflicts,
    ASSETS: schema.assets,
    COMMITTEE_PREFS: schema.committeePrefs,
    COMMITTEE_REPORTS: schema.committeeReports,
    CLASSES: schema.classes,
    SHOW_TEAM: schema.showTeam,
  };

  const target = tableMap[tableKey];
  if (!target) return false;

  await db
    .delete(target)
    .where(
      and(
        eq(target.organizationId, org.id),
        or(eq(target.baserowId, externalRowId), eq(target.id, externalRowId))
      )
    );
  return true;
}
