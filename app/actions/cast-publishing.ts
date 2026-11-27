// app/actions/cast-publishing.ts
"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import { and, eq, or } from "drizzle-orm";
import { getDb, isPostgresEnabled, schema } from "@/db";
import { getOrganizationBySlugPg } from "@/app/lib/db/core-repo";
import { requirePermission } from "@/app/lib/auth-guard";
import {
  buildCastNotificationPlan,
  type CastNotificationCandidate,
} from "@/app/lib/phase1-helpers";

async function resolveProduction(orgId: number, externalId: number) {
  const db = getDb();
  const [prod] = await db
    .select()
    .from(schema.productions)
    .where(
      and(
        eq(schema.productions.organizationId, orgId),
        or(eq(schema.productions.baserowId, externalId), eq(schema.productions.id, externalId))
      )
    )
    .limit(1);
  return prod ?? null;
}

async function buildTenantOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("host") || "localhost:3001";
  const proto = h.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

async function loadNotificationCandidates(orgId: number, internalProdId: number) {
  const db = getDb();
  const [audRows, assignmentRows, roleRows] = await Promise.all([
    db
      .select({
        aud: schema.auditions,
        person: schema.people,
      })
      .from(schema.auditions)
      .leftJoin(schema.people, eq(schema.auditions.performerId, schema.people.id))
      .where(
        and(
          eq(schema.auditions.organizationId, orgId),
          eq(schema.auditions.productionId, internalProdId)
        )
      ),
    db
      .select()
      .from(schema.assignments)
      .where(
        and(
          eq(schema.assignments.organizationId, orgId),
          eq(schema.assignments.productionId, internalProdId)
        )
      ),
    db
      .select({ id: schema.blueprintRoles.id, roleName: schema.blueprintRoles.roleName })
      .from(schema.blueprintRoles)
      .where(eq(schema.blueprintRoles.organizationId, orgId)),
  ]);

  const roleMap = new Map(roleRows.map((r) => [r.id, r.roleName]));
  const rolesByPerson = new Map<number, string[]>();
  for (const a of assignmentRows) {
    if (!a.personId || !a.roleId) continue;
    const roleName = roleMap.get(a.roleId);
    if (!roleName) continue;
    const list = rolesByPerson.get(a.personId) || [];
    if (!list.includes(roleName)) list.push(roleName);
    rolesByPerson.set(a.personId, list);
  }

  const candidates: CastNotificationCandidate[] = audRows.map(({ aud, person }) => {
    const name =
      person?.fullName?.trim() ||
      `${person?.firstName || ""} ${person?.lastName || ""}`.trim() ||
      "Performer";
    const email = (person?.email || person?.familyEmail || person?.secondaryEmail || "").trim();
    const status = (aud.status || "").toLowerCase();
    const isCalledBack =
      status === "called back" ||
      (Boolean(aud.callbackStatus?.trim()) && status !== "dropped");

    return {
      auditionId: aud.id,
      personId: person?.id || 0,
      studentName: name,
      email,
      isCalledBack,
      callbackGroup: aud.callbackStatus || "",
      assignedRoles: person ? rolesByPerson.get(person.id) || [] : [],
    };
  });

  return buildCastNotificationPlan(candidates);
}

export async function getCastPublishStateAction(tenant: string, productionId: number) {
  const guard = await requirePermission(tenant, "manage_casting", productionId);
  if (!guard.ok) return { success: false as const, error: guard.error };
  if (!isPostgresEnabled()) return { success: false as const, error: "PostgreSQL required." };

  const org = await getOrganizationBySlugPg(tenant);
  if (!org) return { success: false as const, error: "Organization not found." };

  const prod = await resolveProduction(org.id, productionId);
  if (!prod) return { success: false as const, error: "Production not found." };

  const plan = await loadNotificationCandidates(org.id, prod.id);

  return {
    success: true as const,
    castPublishedAt: prod.castPublishedAt ? prod.castPublishedAt.toISOString() : null,
    productionTitle: prod.title,
    castOffersCount: plan.castOffers.length,
    notCastCount: plan.notCast.length,
    callbacksCount: plan.callbacks.length,
  };
}

export async function toggleCastPublishedAction(
  tenant: string,
  productionId: number,
  publish: boolean
) {
  const guard = await requirePermission(tenant, "manage_casting", productionId);
  if (!guard.ok) return { success: false as const, error: guard.error };
  if (!isPostgresEnabled()) return { success: false as const, error: "PostgreSQL required." };

  const org = await getOrganizationBySlugPg(tenant);
  if (!org) return { success: false as const, error: "Organization not found." };

  const prod = await resolveProduction(org.id, productionId);
  if (!prod) return { success: false as const, error: "Production not found." };

  const nextPublishedAt = publish ? new Date() : null;
  const db = getDb();
  await db
    .update(schema.productions)
    .set({ castPublishedAt: nextPublishedAt, updatedAt: new Date() })
    .where(eq(schema.productions.id, prod.id));

  revalidatePath(`/${tenant}`);
  revalidatePath(`/${tenant}/production/${productionId}/casting`);
  revalidatePath(`/${tenant}/production/${productionId}/cast`);

  return {
    success: true as const,
    castPublishedAt: nextPublishedAt ? nextPublishedAt.toISOString() : null,
  };
}

export async function sendCallbackInvitesAction(
  tenant: string,
  productionId: number,
  customMessage = ""
) {
  const guard = await requirePermission(tenant, "view_auditions", productionId);
  if (!guard.ok) return { success: false as const, error: guard.error };
  if (!isPostgresEnabled()) return { success: false as const, error: "PostgreSQL required." };
  if (!process.env.RESEND_API_KEY) {
    return {
      success: false as const,
      error: "RESEND_API_KEY is not configured on this server.",
    };
  }

  const org = await getOrganizationBySlugPg(tenant);
  if (!org) return { success: false as const, error: "Organization not found." };

  const prod = await resolveProduction(org.id, productionId);
  if (!prod) return { success: false as const, error: "Production not found." };

  const plan = await loadNotificationCandidates(org.id, prod.id);
  if (plan.callbacks.length === 0) {
    return { success: false as const, error: "No called-back performers have an email on file." };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.EMAIL_FROM_ADDRESS || "Casting Team <casting@open-backstage.org>";
  const origin = await buildTenantOrigin();
  const noteBlock = customMessage.trim()
    ? `<p style="background:#f4f4f5;padding:12px 14px;border-radius:8px;color:#27272a;font-size:14px;white-space:pre-wrap;">${customMessage.trim()}</p>`
    : "";

  let sent = 0;
  let failed = 0;
  for (const recipient of plan.callbacks) {
    try {
      await resend.emails.send({
        from,
        to: recipient.email,
        subject: `Callback Invitation: ${recipient.studentName} — ${prod.title}`,
        html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;border:1px solid #e4e4e7;border-radius:14px;">
          <h2 style="margin:0 0 10px;color:#6d28d9;">You've Been Called Back!</h2>
          <p style="font-size:15px;color:#27272a;">Congratulations! <strong>${recipient.studentName}</strong> has been invited to callbacks for <em>${prod.title}</em> with <strong>${org.name}</strong>.</p>
          ${
            recipient.callbackGroup
              ? `<p style="font-size:14px;color:#3f3f46;"><strong>Callback Group / Roles:</strong> ${recipient.callbackGroup}</p>`
              : ""
          }
          ${noteBlock}
          <p style="margin-top:20px;"><a href="${origin}" style="display:inline-block;background:#6d28d9;color:#fff;text-decoration:none;font-weight:700;padding:10px 18px;border-radius:10px;">Open Family Portal</a></p>
        </div>`,
      });
      sent += 1;
    } catch (err) {
      console.error("[CallbackInvite] Failed for", recipient.email, err);
      failed += 1;
    }
  }

  return { success: true as const, sent, failed };
}

export async function sendCastNotificationsAction(
  tenant: string,
  productionId: number,
  mode: "cast_only" | "all",
  customMessage = ""
) {
  const guard = await requirePermission(tenant, "manage_casting", productionId);
  if (!guard.ok) return { success: false as const, error: guard.error };
  if (!isPostgresEnabled()) return { success: false as const, error: "PostgreSQL required." };
  if (!process.env.RESEND_API_KEY) {
    return {
      success: false as const,
      error: "RESEND_API_KEY is not configured on this server.",
    };
  }

  const org = await getOrganizationBySlugPg(tenant);
  if (!org) return { success: false as const, error: "Organization not found." };

  const prod = await resolveProduction(org.id, productionId);
  if (!prod) return { success: false as const, error: "Production not found." };

  // Ensure cast list is published when sending cast notifications
  if (!prod.castPublishedAt) {
    const db = getDb();
    await db
      .update(schema.productions)
      .set({ castPublishedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.productions.id, prod.id));
  }

  const plan = await loadNotificationCandidates(org.id, prod.id);
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.EMAIL_FROM_ADDRESS || "Casting Team <casting@open-backstage.org>";
  const origin = await buildTenantOrigin();
  const noteBlock = customMessage.trim()
    ? `<p style="background:#f4f4f5;padding:12px 14px;border-radius:8px;color:#27272a;font-size:14px;white-space:pre-wrap;">${customMessage.trim()}</p>`
    : "";

  let sentCast = 0;
  let sentThankYou = 0;
  let failed = 0;

  for (const r of plan.castOffers) {
    try {
      await resend.emails.send({
        from,
        to: r.email,
        subject: `Cast List Posted: ${r.studentName} in ${prod.title}!`,
        html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;border:1px solid #e4e4e7;border-radius:14px;">
          <h2 style="margin:0 0 10px;color:#2563eb;">Congratulations!</h2>
          <p style="font-size:15px;color:#27272a;">The cast list for <em>${prod.title}</em> (${org.name}) is now live! <strong>${r.studentName}</strong> has been offered the role of <strong>${r.assignedRoles.join(", ")}</strong>.</p>
          ${noteBlock}
          <p style="margin-top:20px;"><a href="${origin}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:700;padding:10px 18px;border-radius:10px;">Accept Role in Family Hub</a></p>
        </div>`,
      });
      sentCast += 1;
    } catch (err) {
      console.error("[CastOffer] Failed for", r.email, err);
      failed += 1;
    }
  }

  if (mode === "all") {
    for (const r of plan.notCast) {
      try {
        await resend.emails.send({
          from,
          to: r.email,
          subject: `Thank You for Auditioning for ${prod.title}`,
          html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;border:1px solid #e4e4e7;border-radius:14px;">
            <h2 style="margin:0 0 10px;color:#18181b;">Thank You for Auditioning</h2>
            <p style="font-size:15px;color:#27272a;">Thank you to <strong>${r.studentName}</strong> for sharing their talent at auditions for <em>${prod.title}</em> with <strong>${org.name}</strong>. While we were not able to place everyone in this production's cast, we are so grateful you auditioned and hope to see you in our upcoming classes and shows.</p>
          </div>`,
        });
        sentThankYou += 1;
      } catch (err) {
        console.error("[NotCast] Failed for", r.email, err);
        failed += 1;
      }
    }
  }

  revalidatePath(`/${tenant}`);
  revalidatePath(`/${tenant}/production/${productionId}/casting`);

  return { success: true as const, sentCast, sentThankYou, failed };
}
