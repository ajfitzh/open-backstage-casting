// app/actions/phase2-ops.ts
"use server";

import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import { and, eq, or } from "drizzle-orm";
import { getDb, isPostgresEnabled, schema } from "@/db";
import { getOrganizationBySlugPg } from "@/app/lib/db/core-repo";
import {
  requireAuthenticatedUser,
  requirePermission,
  requireStaffAccess,
} from "@/app/lib/auth-guard";
import {
  cancelTicketOrderPg,
  createPromoCodePg,
  getOrderForResendPg,
  listPromoCodesPg,
  sellDoorTicketsPg,
  submitFamilyConflictPg,
  togglePromoCodePg,
  updateAssignmentCastTrackPg,
  validatePromoCodePg,
} from "@/app/lib/db/phase2-repo";
import {
  buildRehearsalReportEmailHtml,
  type PromoDiscountType,
} from "@/app/lib/phase2-helpers";

export async function sellDoorTicketsAction(
  tenant: string,
  performanceId: number,
  input: {
    buyerName: string;
    buyerEmail?: string;
    quantity: number;
    paymentMethod: "cash" | "comp" | "card_terminal";
  }
) {
  const guard = await requireStaffAccess();
  if (!guard.ok) return { success: false as const, error: guard.error };

  const res = await sellDoorTicketsPg(tenant, performanceId, input);
  if (!res.success) return res;

  // Optionally email QR tickets if a real buyer email was entered and Resend is configured
  const cleanEmail = (input.buyerEmail || "").trim().toLowerCase();
  if (
    process.env.RESEND_API_KEY &&
    cleanEmail &&
    cleanEmail.includes("@") &&
    !cleanEmail.endsWith(".local")
  ) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.EMAIL_FROM_ADDRESS || "Box Office <tickets@open-backstage.org>",
        to: cleanEmail,
        subject: `Your Tickets: ${res.performanceLabel} (${res.orgName})`,
        html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:20px;border:1px solid #e4e4e7;border-radius:12px;">
          <h2 style="margin:0 0 10px;">Your Box Office Tickets</h2>
          <p>Hi ${input.buyerName || "Guest"},</p>
          <p>Here are your ticket code(s) for <strong>${res.performanceLabel}</strong> (${res.performanceDate}):</p>
          <ul style="font-family:monospace;font-size:15px;">
            ${res.tickets.map((t) => `<li>${t.code}</li>`).join("")}
          </ul>
          <p style="font-size:12px;color:#71717a;">Show these codes at the door for scanning.</p>
        </div>`,
      });
    } catch (err) {
      console.error("[DoorSales] Email receipt failed:", err);
    }
  }

  revalidatePath(`/${tenant}/box-office`);
  revalidatePath(`/${tenant}/tickets`);
  revalidatePath(`/${tenant}/reports`);
  return res;
}

export async function cancelTicketOrderAction(tenant: string, orderId: number) {
  const guard = await requireStaffAccess();
  if (!guard.ok) return { success: false as const, error: guard.error };

  const res = await cancelTicketOrderPg(tenant, orderId);
  if (res.success) {
    revalidatePath(`/${tenant}/box-office`);
    revalidatePath(`/${tenant}/tickets`);
    revalidatePath(`/${tenant}/reports`);
  }
  return res;
}

export async function resendTicketOrderEmailAction(tenant: string, orderId: number) {
  const guard = await requireStaffAccess();
  if (!guard.ok) return { success: false as const, error: guard.error };
  if (!process.env.RESEND_API_KEY) {
    return { success: false as const, error: "RESEND_API_KEY is not configured." };
  }

  const order = await getOrderForResendPg(tenant, orderId);
  if (!order) return { success: false as const, error: "Order not found." };
  if (!order.buyerEmail || order.buyerEmail.endsWith(".local")) {
    return { success: false as const, error: "Order has no deliverable email address." };
  }
  if (order.codes.length === 0) {
    return { success: false as const, error: "No active tickets remaining on this order." };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.EMAIL_FROM_ADDRESS || "Box Office <tickets@open-backstage.org>",
      to: order.buyerEmail,
      subject: `Resent Tickets: ${order.productionTitle} — ${order.performanceLabel}`,
      html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:20px;border:1px solid #e4e4e7;border-radius:12px;">
        <h2 style="margin:0 0 10px;">Your Tickets for ${order.productionTitle}</h2>
        <p>Hi ${order.buyerName},</p>
        <p>Here are your active ticket code(s) for <strong>${order.performanceLabel}</strong> (${order.performanceDate}):</p>
        <ul style="font-family:monospace;font-size:15px;">
          ${order.codes.map((c) => `<li>${c}</li>`).join("")}
        </ul>
      </div>`,
    });
    return { success: true as const, email: order.buyerEmail };
  } catch (err) {
    console.error("[ResendTickets] Failed:", err);
    return { success: false as const, error: "Failed to send email." };
  }
}

export async function listPromoCodesAction(tenant: string, productionId?: number) {
  const guard = await requireStaffAccess();
  if (!guard.ok) return { success: false as const, error: guard.error, promos: [] };
  const promos = await listPromoCodesPg(tenant, productionId);
  return { success: true as const, promos };
}

export async function createPromoCodeAction(
  tenant: string,
  input: {
    productionId?: number | null;
    code: string;
    discountType: PromoDiscountType;
    discountValue: number;
    maxUses?: number | null;
  }
) {
  const guard = await requireStaffAccess();
  if (!guard.ok) return { success: false as const, error: guard.error };
  const res = await createPromoCodePg(tenant, input);
  if (res.success) revalidatePath(`/${tenant}/box-office`);
  return res;
}

export async function togglePromoCodeAction(tenant: string, promoId: number, active: boolean) {
  const guard = await requireStaffAccess();
  if (!guard.ok) return { success: false as const, error: guard.error };
  const res = await togglePromoCodePg(tenant, promoId, active);
  if (res.success) revalidatePath(`/${tenant}/box-office`);
  return res;
}

export async function validatePromoCodeAction(
  tenant: string,
  rawCode: string,
  unitPriceCents: number,
  quantity: number
) {
  return await validatePromoCodePg(tenant, rawCode, unitPriceCents, quantity);
}

export async function updateAssignmentCastTrackAction(
  tenant: string,
  productionId: number,
  assignmentId: number,
  castTrack: string
) {
  const guard = await requirePermission(tenant, "manage_casting", productionId);
  if (!guard.ok) return { success: false as const, error: guard.error };
  const res = await updateAssignmentCastTrackPg(tenant, assignmentId, castTrack);
  if (res.success) {
    revalidatePath(`/${tenant}/production/${productionId}/casting`);
    revalidatePath(`/${tenant}/production/${productionId}/cast`);
  }
  return res;
}

export async function submitFamilyConflictAction(
  tenant: string,
  productionId: number,
  input: {
    studentExternalId: number;
    eventExternalId?: number | null;
    conflictType: string;
    notes: string;
  }
) {
  const guard = await requireAuthenticatedUser();
  if (!guard.ok) return { success: false as const, error: guard.error };
  const res = await submitFamilyConflictPg(tenant, productionId, guard.user.email, input);
  if (res.success) {
    revalidatePath(`/${tenant}`);
    revalidatePath(`/${tenant}/production/${productionId}/conflicts`);
  }
  return res;
}

export async function sendRehearsalReportEmailAction(
  tenant: string,
  productionId: number,
  input: {
    reportDate: string;
    presentCount: number;
    lateNames: string[];
    absentNames: string[];
    highlights: string;
    techCostumeNotes: string;
  }
) {
  const guard = await requireStaffAccess();
  if (!guard.ok) return { success: false as const, error: guard.error };
  if (!isPostgresEnabled()) return { success: false as const, error: "PostgreSQL required." };
  if (!process.env.RESEND_API_KEY) {
    return { success: false as const, error: "RESEND_API_KEY is not configured." };
  }

  const org = await getOrganizationBySlugPg(tenant);
  if (!org) return { success: false as const, error: "Organization not found." };

  const db = getDb();
  const [prod] = await db
    .select()
    .from(schema.productions)
    .where(
      and(
        eq(schema.productions.organizationId, org.id),
        or(eq(schema.productions.baserowId, productionId), eq(schema.productions.id, productionId))
      )
    )
    .limit(1);
  if (!prod) return { success: false as const, error: "Production not found." };

  // Find creative team + production staff emails
  const teamRows = await db
    .select({ email: schema.people.email })
    .from(schema.showTeam)
    .innerJoin(schema.people, eq(schema.showTeam.personId, schema.people.id))
    .where(
      and(
        eq(schema.showTeam.organizationId, org.id),
        eq(schema.showTeam.productionId, prod.id)
      )
    );

  const recipients = Array.from(
    new Set(
      [
        guard.user.email,
        ...teamRows.map((r) => (r.email || "").trim().toLowerCase()),
      ].filter((e) => e && e.includes("@"))
    )
  );

  const html = buildRehearsalReportEmailHtml({
    orgName: org.name,
    productionTitle: prod.title,
    reportDate: input.reportDate,
    stageManagerName: guard.user.name || guard.user.email,
    presentCount: input.presentCount,
    lateNames: input.lateNames,
    absentNames: input.absentNames,
    highlights: input.highlights,
    techCostumeNotes: input.techCostumeNotes,
  });

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: process.env.EMAIL_FROM_ADDRESS || "Stage Management <reports@open-backstage.org>",
    to: recipients,
    subject: `Rehearsal Report: ${prod.title} (${input.reportDate})`,
    html,
  });

  return { success: true as const, recipientCount: recipients.length };
}
