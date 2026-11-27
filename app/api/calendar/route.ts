// app/api/calendar/route.ts
// Subscribeable RFC 5545 .ics calendar feed per production (and optionally filtered/annotated for a student).
import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, or } from "drizzle-orm";
import { getDb, isPostgresEnabled, schema } from "@/db";
import { getOrganizationBySlugPg } from "@/app/lib/db/core-repo";
import { buildIcsCalendar, type IcsEventInput } from "@/app/lib/features-helpers";
import { verifyCalendarToken } from "@/app/lib/phase1-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tenant = (searchParams.get("tenant") || "").trim().toLowerCase();
  const productionIdRaw = searchParams.get("productionId");
  const studentIdRaw = searchParams.get("studentId");
  const token = searchParams.get("token");

  if (!tenant) {
    return NextResponse.json({ error: "Missing tenant parameter." }, { status: 400 });
  }

  const productionId = productionIdRaw ? parseInt(productionIdRaw, 10) : NaN;
  if (!Number.isFinite(productionId) || productionId <= 0) {
    return NextResponse.json({ error: "Valid productionId parameter is required." }, { status: 400 });
  }

  const parsedStudentId = studentIdRaw ? parseInt(studentIdRaw, 10) : null;
  if (token) {
    const valid = verifyCalendarToken(token, {
      tenant,
      productionId,
      studentId: Number.isFinite(parsedStudentId) ? parsedStudentId : null,
    });
    if (!valid) {
      return NextResponse.json({ error: "Invalid calendar feed signature." }, { status: 403 });
    }
  }

  if (!isPostgresEnabled()) {
    return NextResponse.json({ error: "Calendar feed requires PostgreSQL." }, { status: 503 });
  }

  try {
    const org = await getOrganizationBySlugPg(tenant);
    if (!org) {
      return NextResponse.json({ error: "Organization not found." }, { status: 404 });
    }

    const db = getDb();
    const [production] = await db
      .select()
      .from(schema.productions)
      .where(
        and(
          eq(schema.productions.organizationId, org.id),
          or(
            eq(schema.productions.baserowId, productionId),
            eq(schema.productions.id, productionId)
          )
        )
      )
      .limit(1);

    if (!production) {
      return NextResponse.json({ error: "Production not found." }, { status: 404 });
    }

    const [eventRows, slotRows, sceneRows] = await Promise.all([
      db
        .select()
        .from(schema.events)
        .where(
          and(
            eq(schema.events.organizationId, org.id),
            eq(schema.events.productionId, production.id)
          )
        )
        .orderBy(asc(schema.events.eventDate), asc(schema.events.startTime)),
      db
        .select()
        .from(schema.scheduleSlots)
        .where(
          and(
            eq(schema.scheduleSlots.organizationId, org.id),
            eq(schema.scheduleSlots.productionId, production.id)
          )
        ),
      db
        .select()
        .from(schema.scenes)
        .where(
          and(
            eq(schema.scenes.organizationId, org.id),
            eq(schema.scenes.productionId, production.id)
          )
        ),
    ]);

    let studentName: string | null = null;
    let studentSceneIds: Set<number> | null = null;

    if (studentIdRaw) {
      const studentId = parseInt(studentIdRaw, 10);
      if (Number.isFinite(studentId) && studentId > 0) {
        const [student] = await db
          .select()
          .from(schema.people)
          .where(
            and(
              eq(schema.people.organizationId, org.id),
              or(eq(schema.people.baserowId, studentId), eq(schema.people.id, studentId))
            )
          )
          .limit(1);

        if (student) {
          studentName =
            student.fullName ||
            `${student.firstName || ""} ${student.lastName || ""}`.trim() ||
            null;

          const studentSceneAssignments = await db
            .select({ sceneId: schema.sceneAssignments.sceneId })
            .from(schema.sceneAssignments)
            .where(
              and(
                eq(schema.sceneAssignments.organizationId, org.id),
                eq(schema.sceneAssignments.productionId, production.id),
                eq(schema.sceneAssignments.personId, student.id)
              )
            );

          if (studentSceneAssignments.length > 0) {
            studentSceneIds = new Set(
              studentSceneAssignments
                .map((sa) => sa.sceneId)
                .filter((id): id is number => id != null)
            );
          }
        }
      }
    }

    const sceneNameMap = new Map(sceneRows.map((s) => [s.id, s.sceneName]));
    const slotsByEvent = new Map<number, typeof slotRows>();
    for (const slot of slotRows) {
      if (!slot.eventId) continue;
      const list = slotsByEvent.get(slot.eventId) || [];
      list.push(slot);
      slotsByEvent.set(slot.eventId, list);
    }

    const icsEvents: IcsEventInput[] = [];
    for (const ev of eventRows) {
      if (!ev.eventDate) continue;
      const evSlots = slotsByEvent.get(ev.id) || [];

      // If filtering by student and this event has scene slots, only include if required/show/tech or student is in a scene
      const isMandatoryType =
        ev.isRequired ||
        ["Performance", "Tech", "Dress Rehearsal", "Full Run"].includes(ev.eventType || "");

      let calledSceneNames: string[] = [];
      if (evSlots.length > 0) {
        const matchingSlots = studentSceneIds
          ? evSlots.filter((sl) => sl.sceneId && studentSceneIds!.has(sl.sceneId))
          : evSlots;

        if (studentSceneIds && !isMandatoryType && matchingSlots.length === 0) {
          continue;
        }
        calledSceneNames = Array.from(
          new Set(
            matchingSlots
              .map((sl) => (sl.sceneId ? sceneNameMap.get(sl.sceneId) : sl.name))
              .filter((v): v is string => Boolean(v))
          )
        );
      }

      const descriptionParts: string[] = [];
      if (ev.eventType) descriptionParts.push(`Type: ${ev.eventType}`);
      if (calledSceneNames.length > 0) {
        descriptionParts.push(`Scenes Called: ${calledSceneNames.join(", ")}`);
      }
      if (ev.notes) descriptionParts.push(ev.notes);
      descriptionParts.push(`Powered by Open Backstage (${org.name})`);

      icsEvents.push({
        uid: `openbackstage-${org.slug}-prod-${production.id}-event-${ev.id}@open-backstage.org`,
        title: `${production.title}: ${ev.eventType || "Rehearsal"}`,
        date: ev.eventDate,
        startTime: ev.startTime,
        endTime: ev.endTime,
        location: org.name,
        description: descriptionParts.join("\n"),
      });
    }

    const calendarTitle = studentName
      ? `${production.title} — ${studentName}`
      : `${production.title} (${org.name})`;

    const icsBody = buildIcsCalendar({
      calendarName: calendarTitle,
      events: icsEvents,
    });

    const safeFileName = `${production.title.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}_schedule.ics`;

    return new NextResponse(icsBody, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `inline; filename="${safeFileName}"`,
        "Cache-Control": "no-cache, max-age=300",
      },
    });
  } catch (err) {
    console.error("[Calendar ICS] Failed to generate feed:", err);
    return NextResponse.json({ error: "Failed to build calendar feed." }, { status: 500 });
  }
}
