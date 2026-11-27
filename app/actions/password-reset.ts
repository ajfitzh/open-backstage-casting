// app/actions/password-reset.ts
"use server";

import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { Resend } from "resend";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { getDb, isPostgresEnabled, schema } from "@/db";
import { getOrganizationBySlugPg } from "@/app/lib/db/core-repo";
import { requireStaffAccess } from "@/app/lib/auth-guard";
import {
  generateRawResetToken,
  hashResetToken,
  validateNewPassword,
} from "@/app/lib/phase1-helpers";

async function buildTenantOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("host") || "localhost:3001";
  const proto = h.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

async function sendResetEmail(opts: {
  to: string;
  recipientName: string;
  orgName: string;
  resetUrl: string;
  purpose: "reset" | "invite";
}) {
  if (!process.env.RESEND_API_KEY) {
    return { sent: false, reason: "RESEND_API_KEY not configured" };
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const isInvite = opts.purpose === "invite";
  const subject = isInvite
    ? `You're invited to ${opts.orgName} on Open Backstage`
    : `Reset your ${opts.orgName} password`;

  await resend.emails.send({
    from: process.env.EMAIL_FROM_ADDRESS || "Open Backstage <noreply@open-backstage.org>",
    to: opts.to,
    subject,
    html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e4e4e7; border-radius: 14px;">
      <h2 style="margin: 0 0 12px; color: #18181b;">${isInvite ? `Welcome to ${opts.orgName}` : "Reset Your Password"}</h2>
      <p style="color: #3f3f46; font-size: 15px; line-height: 1.6;">
        Hi ${opts.recipientName || "there"},
      </p>
      <p style="color: #3f3f46; font-size: 15px; line-height: 1.6;">
        ${
          isInvite
            ? `You have been invited to join <strong>${opts.orgName}</strong> on Open Backstage. Click below to set your password and access the portal:`
            : `We received a request to reset your password for <strong>${opts.orgName}</strong>. Click below to choose a new password:`
        }
      </p>
      <p style="margin: 24px 0;">
        <a href="${opts.resetUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; font-weight: 700; padding: 12px 22px; border-radius: 10px;">
          ${isInvite ? "Set Your Password" : "Reset Password"}
        </a>
      </p>
      <p style="color: #71717a; font-size: 12px; line-height: 1.5;">
        This link expires in ${isInvite ? "72 hours" : "1 hour"} and can only be used once. If you did not request this, you can safely ignore this email.
      </p>
    </div>`,
  });

  return { sent: true };
}

export async function requestPasswordResetAction(tenant: string, email: string) {
  const cleanEmail = (email || "").trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) {
    return { success: false, error: "Please enter a valid email address." };
  }

  if (!isPostgresEnabled()) {
    return { success: false, error: "Password reset requires PostgreSQL." };
  }

  const org = await getOrganizationBySlugPg(tenant);
  if (!org) {
    return {
      success: true,
      message: "If an account matches that email, we sent a password reset link.",
    };
  }

  const db = getDb();
  const [person] = await db
    .select()
    .from(schema.people)
    .where(
      and(
        eq(schema.people.organizationId, org.id),
        or(eq(schema.people.email, cleanEmail), eq(schema.people.secondaryEmail, cleanEmail))
      )
    )
    .limit(1);

  if (!person) {
    // Neutral response prevents email enumeration
    return {
      success: true,
      message: "If an account matches that email, we sent a password reset link.",
    };
  }

  const rawToken = generateRawResetToken();
  const tokenHash = hashResetToken(rawToken);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.insert(schema.passwordResetTokens).values({
    organizationId: org.id,
    personId: person.id,
    email: cleanEmail,
    tokenHash,
    purpose: "reset",
    expiresAt,
  });

  const origin = await buildTenantOrigin();
  const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(rawToken)}`;

  try {
    await sendResetEmail({
      to: cleanEmail,
      recipientName: person.fullName || person.firstName || "",
      orgName: org.name,
      resetUrl,
      purpose: "reset",
    });
  } catch (err) {
    console.error("[PasswordReset] Email send failed:", err);
  }

  return {
    success: true,
    message: "If an account matches that email, we sent a password reset link.",
  };
}

export async function sendAdminInviteAction(
  tenant: string,
  personExternalId: number,
  purpose: "invite" | "reset" = "invite"
) {
  const guard = await requireStaffAccess();
  if (!guard.ok) return { success: false as const, error: guard.error };

  if (!isPostgresEnabled()) {
    return { success: false as const, error: "Invites require PostgreSQL." };
  }

  const org = await getOrganizationBySlugPg(tenant);
  if (!org) return { success: false as const, error: "Organization not found." };

  const db = getDb();
  const [person] = await db
    .select()
    .from(schema.people)
    .where(
      and(
        eq(schema.people.organizationId, org.id),
        or(eq(schema.people.baserowId, personExternalId), eq(schema.people.id, personExternalId))
      )
    )
    .limit(1);

  if (!person) return { success: false as const, error: "Person not found." };
  const targetEmail = (person.email || person.secondaryEmail || "").trim().toLowerCase();
  if (!targetEmail || !targetEmail.includes("@")) {
    return {
      success: false as const,
      error: "This person does not have an email address on file yet.",
    };
  }

  const rawToken = generateRawResetToken();
  const tokenHash = hashResetToken(rawToken);
  const ttlMs = purpose === "invite" ? 72 * 60 * 60 * 1000 : 60 * 60 * 1000;
  const expiresAt = new Date(Date.now() + ttlMs);

  await db.insert(schema.passwordResetTokens).values({
    organizationId: org.id,
    personId: person.id,
    email: targetEmail,
    tokenHash,
    purpose,
    expiresAt,
  });

  const origin = await buildTenantOrigin();
  const inviteUrl = `${origin}/reset-password?token=${encodeURIComponent(rawToken)}`;

  let emailSent = false;
  try {
    const res = await sendResetEmail({
      to: targetEmail,
      recipientName: person.fullName || person.firstName || "",
      orgName: org.name,
      resetUrl: inviteUrl,
      purpose,
    });
    emailSent = res.sent;
  } catch (err) {
    console.error("[AdminInvite] Email failed:", err);
  }

  return {
    success: true as const,
    email: targetEmail,
    emailSent,
    inviteUrl,
  };
}

export async function completePasswordResetAction(
  tenant: string,
  rawToken: string,
  newPassword: string
) {
  const pwCheck = validateNewPassword(newPassword);
  if (!pwCheck.ok) return { success: false, error: pwCheck.error };

  if (!rawToken || !rawToken.trim()) {
    return { success: false, error: "Missing reset token." };
  }

  if (!isPostgresEnabled()) {
    return { success: false, error: "Password reset requires PostgreSQL." };
  }

  const org = await getOrganizationBySlugPg(tenant);
  if (!org) return { success: false, error: "Organization not found." };

  const tokenHash = hashResetToken(rawToken);
  const now = new Date();
  const db = getDb();

  const [tokenRow] = await db
    .select()
    .from(schema.passwordResetTokens)
    .where(
      and(
        eq(schema.passwordResetTokens.organizationId, org.id),
        eq(schema.passwordResetTokens.tokenHash, tokenHash),
        isNull(schema.passwordResetTokens.usedAt),
        gt(schema.passwordResetTokens.expiresAt, now)
      )
    )
    .limit(1);

  if (!tokenRow) {
    return {
      success: false,
      error: "This reset link is invalid or has expired. Please request a new one.",
    };
  }

  const passwordHash = await bcrypt.hash(newPassword.trim(), 10);

  await db
    .update(schema.people)
    .set({ passwordHash, updatedAt: now })
    .where(
      and(eq(schema.people.organizationId, org.id), eq(schema.people.id, tokenRow.personId))
    );

  await db
    .update(schema.passwordResetTokens)
    .set({ usedAt: now })
    .where(eq(schema.passwordResetTokens.id, tokenRow.id));

  return { success: true };
}
