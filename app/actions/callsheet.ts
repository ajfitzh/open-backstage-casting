// app/actions/callsheet.ts
"use server";

import { Resend } from "resend";
import { and, eq, inArray, or } from "drizzle-orm";
import { requirePermission } from "@/app/lib/auth-guard";
import { getDb, isPostgresEnabled, schema } from "@/db";
import { getOrganizationBySlugPg } from "@/app/lib/db/core-repo";
import {
  resolveCallSheetRecipients,
  type CallSheetConflict,
  type CallSheetRosterMember,
} from "@/app/lib/features-helpers";

export interface CallSheetEmailPayload {
  tenant: string;
  productionId: number;
  productionTitle: string;
  eventTitle: string;
  eventDate: string;
  timeRange: string;
  location: string;
  calledNames: string[];
  scenesSummary: string[];
  reminders: string;
  cleanupCrew?: string;
}

async function loadProductionRosterAndConflicts(
  tenant: string,
  productionId: number
): Promise<{
  orgName: string;
  roster: CallSheetRosterMember[];
  conflicts: CallSheetConflict[];
} | null> {
  if (!isPostgresEnabled()) return null;
  const org = await getOrganizationBySlugPg(tenant);
  if (!org) return null;

  const db = getDb();
  const [prod] = await db
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

  if (!prod) return null;

  const [assignmentRows, auditionRows, conflictRows] = await Promise.all([
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
      .select({ performerId: schema.auditions.performerId })
      .from(schema.auditions)
      .where(
        and(
          eq(schema.auditions.organizationId, org.id),
          eq(schema.auditions.productionId, prod.id)
        )
      ),
    db
      .select()
      .from(schema.conflicts)
      .where(
        and(
          eq(schema.conflicts.organizationId, org.id),
          eq(schema.conflicts.productionId, prod.id)
        )
      ),
  ]);

  const personIds = Array.from(
    new Set([
      ...assignmentRows.map((a) => a.personId).filter((id): id is number => id != null),
      ...auditionRows.map((a) => a.performerId).filter((id): id is number => id != null),
    ])
  );

  if (personIds.length === 0) {
    return { orgName: org.name, roster: [], conflicts: [] };
  }

  const peopleRows = await db
    .select({
      id: schema.people.id,
      baserowId: schema.people.baserowId,
      fullName: schema.people.fullName,
      firstName: schema.people.firstName,
      lastName: schema.people.lastName,
      email: schema.people.email,
      secondaryEmail: schema.people.secondaryEmail,
    })
    .from(schema.people)
    .where(and(eq(schema.people.organizationId, org.id), inArray(schema.people.id, personIds)));

  const peopleNameMap = new Map<number, string>();
  const roster: CallSheetRosterMember[] = peopleRows.map((p) => {
    const name =
      p.fullName || `${p.firstName || ""} ${p.lastName || ""}`.trim() || `Actor #${p.id}`;
    peopleNameMap.set(p.id, name);
    return {
      id: p.baserowId ?? p.id,
      name,
      email: p.email,
      secondaryEmail: p.secondaryEmail,
    };
  });

  // Load event dates for conflict lookup
  const eventRows = await db
    .select({ id: schema.events.id, eventDate: schema.events.eventDate })
    .from(schema.events)
    .where(
      and(eq(schema.events.organizationId, org.id), eq(schema.events.productionId, prod.id))
    );
  const eventDateMap = new Map(eventRows.map((e) => [e.id, e.eventDate]));

  const conflicts: CallSheetConflict[] = conflictRows.map((c) => ({
    personId: c.personId,
    personName: c.personId ? peopleNameMap.get(c.personId) ?? null : null,
    date: c.eventId ? eventDateMap.get(c.eventId) ?? null : null,
    reason: c.notes || c.conflictType || "Submitted conflict",
  }));

  return { orgName: org.name, roster, conflicts };
}

export async function previewCallSheet(
  tenant: string,
  productionId: number,
  calledNames: string[],
  eventDate?: string
) {
  const guard = await requirePermission(tenant, "view_cast_list", productionId);
  if (!guard.ok) return { success: false as const, error: guard.error };

  const data = await loadProductionRosterAndConflicts(tenant, productionId);
  if (!data) return { success: false as const, error: "Could not load production roster." };

  const summary = resolveCallSheetRecipients({
    calledNames,
    roster: data.roster,
    conflicts: data.conflicts,
    eventDate,
  });

  return {
    success: true as const,
    orgName: data.orgName,
    ...summary,
  };
}

export async function sendCallSheetEmail(payload: CallSheetEmailPayload) {
  const guard = await requirePermission(payload.tenant, "view_cast_list", payload.productionId);
  if (!guard.ok) return { success: false as const, error: guard.error };

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return {
      success: false as const,
      error: "Email delivery is not configured (missing RESEND_API_KEY).",
    };
  }

  const data = await loadProductionRosterAndConflicts(payload.tenant, payload.productionId);
  if (!data) return { success: false as const, error: "Could not load production roster." };

  const resolved = resolveCallSheetRecipients({
    calledNames: payload.calledNames,
    roster: data.roster,
    conflicts: data.conflicts,
    eventDate: payload.eventDate,
  });

  if (resolved.emails.length === 0) {
    return {
      success: false as const,
      error: "No family email addresses were found for the called cast members.",
    };
  }

  const fromAddress =
    process.env.EMAIL_FROM_ADDRESS || "Stage Management <stage@open-backstage.org>";
  const appBase =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://open-backstage.org");
  const icsUrl = `${appBase}/api/calendar?tenant=${encodeURIComponent(payload.tenant)}&productionId=${payload.productionId}`;

  const scenesHtml =
    payload.scenesSummary.length > 0
      ? `<div style="margin: 16px 0;">
          <h3 style="margin: 0 0 8px; color: #111827; font-size: 14px; text-transform: uppercase;">Scenes Called</h3>
          <div style="display: flex; flex-wrap: wrap; gap: 6px;">
            ${payload.scenesSummary
              .map(
                (s) =>
                  `<span style="background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; padding: 4px 10px; border-radius: 6px; font-size: 13px; font-weight: 600;">${s}</span>`
              )
              .join(" ")}
          </div>
        </div>`
      : "";

  const conflictsHtml =
    resolved.conflictAlerts.length > 0
      ? `<div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 12px 14px; margin: 16px 0;">
          <h4 style="margin: 0 0 6px; color: #92400e; font-size: 13px; text-transform: uppercase;">⚠️ Logged Conflicts for ${payload.eventDate}</h4>
          <ul style="margin: 0; padding-left: 18px; color: #78350f; font-size: 13px;">
            ${resolved.conflictAlerts.map((c) => `<li><strong>${c.name}</strong> — ${c.reason}</li>`).join("")}
          </ul>
        </div>`
      : "";

  const cleanupHtml = payload.cleanupCrew
    ? `<p style="font-size: 13px; color: #374151; margin-top: 12px;"><strong>Cleanup Crew:</strong> ${payload.cleanupCrew}</p>`
    : "";

  const formattedReminders = (payload.reminders || "").replace(/\n/g, "<br/>");
  const formattedLocation = (payload.location || "See studio details").replace(/\n/g, "<br/>");

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 14px; color: #1f2937;">
      <p style="margin: 0; font-size: 11px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: #2563eb;">
        ${data.orgName} • Official Call Sheet
      </p>
      <h1 style="margin: 6px 0 4px; font-size: 24px; color: #111827;">
        ${payload.productionTitle}: ${payload.eventTitle}
      </h1>
      <p style="margin: 0 0 18px; font-size: 14px; color: #4b5563;">
        <strong>Date:</strong> ${payload.eventDate} &nbsp;•&nbsp; <strong>Call Time:</strong> ${payload.timeRange}
      </p>

      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; margin-bottom: 16px;">
        <h3 style="margin: 0 0 6px; font-size: 12px; text-transform: uppercase; color: #6b7280;">Location & Logistics</h3>
        <p style="margin: 0; font-size: 14px; line-height: 1.5;">${formattedLocation}</p>
        ${cleanupHtml}
      </div>

      ${scenesHtml}
      ${conflictsHtml}

      ${
        formattedReminders
          ? `<div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 14px; margin: 16px 0;">
              <h3 style="margin: 0 0 6px; font-size: 12px; text-transform: uppercase; color: #1e40af;">Important Reminders</h3>
              <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #1e3a8a;">${formattedReminders}</p>
            </div>`
          : ""
      }

      <div style="margin-top: 22px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center;">
        <a href="${icsUrl}" style="display: inline-block; background: #111827; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 8px; font-size: 12px; font-weight: 700;">
          📅 Subscribe to Show Calendar (.ics)
        </a>
        <p style="font-size: 11px; color: #9ca3af; margin-top: 12px;">
          Sent via Open Backstage Stage Management
        </p>
      </div>
    </div>
  `;

  try {
    const resend = new Resend(apiKey);
    // Resend supports up to 50 recipients per BCC call — batch cleanly for large casts.
    const batchSize = 48;
    for (let i = 0; i < resolved.emails.length; i += batchSize) {
      const batch = resolved.emails.slice(i, i + batchSize);
      const { error } = await resend.emails.send({
        from: fromAddress,
        to: fromAddress,
        bcc: batch,
        subject: `🎭 Call Sheet: ${payload.productionTitle} — ${payload.eventTitle} (${payload.eventDate})`,
        html,
      });
      if (error) {
        console.error("[CallSheet] Resend batch error:", error);
        return { success: false as const, error: error.message };
      }
    }

    return {
      success: true as const,
      sentCount: resolved.emails.length,
      conflictCount: resolved.conflictAlerts.length,
    };
  } catch (err: any) {
    console.error("[CallSheet] Unexpected email failure:", err);
    return { success: false as const, error: err?.message || "Failed to send call sheet." };
  }
}
