"use server";

import { headers } from "next/headers";
import { Resend } from "resend";
import { auth } from "@/auth";
import { isPostgresEnabled } from "@/db";
import { provisionOrganizationPg, recordOnboardingRequestPg } from "@/app/lib/db/core-repo";
import { normalizeAndValidateOrgSlug } from "@/app/lib/db/role-helpers";
import { buildTenantUrl } from "@/app/lib/tenant-utils";
import { createHandoffToken } from "@/app/lib/workspace-handoff";

export interface OrgRequestPayload {
  organizationName: string;
  desiredSlug?: string;
  contactName: string;
  contactEmail: string;
  organizationType: string;
  notes?: string;
}

export async function submitOrganizationRequest(payload: OrgRequestPayload) {
  const organizationName = (payload.organizationName || "").trim();
  const contactName = (payload.contactName || "").trim();
  const contactEmail = (payload.contactEmail || "").trim();

  if (!organizationName || !contactName || !contactEmail) {
    return {
      success: false,
      error: "Please enter your organization name, your name, and your email address.",
    };
  }

  const suggestedSlug =
    (payload.desiredSlug || organizationName)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 32) || "new-org";

  console.log("[Onboarding Request]", {
    organizationName,
    suggestedSlug,
    contactName,
    contactEmail,
    organizationType: payload.organizationType,
    notes: payload.notes || "",
  });

  if (isPostgresEnabled()) {
    try {
      await recordOnboardingRequestPg({
        organizationName,
        requestedSlug: suggestedSlug,
        organizationType: payload.organizationType || "Theater",
        contactName,
        contactEmail,
        notes: payload.notes,
      });
    } catch (err) {
      console.error("[Onboarding Request] Failed to save to Postgres:", err);
    }
  }

  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const notifyTo = process.env.EMAIL_FROM_ADDRESS || "database@cytfred.org";
      await resend.emails.send({
        from: process.env.EMAIL_FROM_ADDRESS || "Open Backstage <casting@open-backstage.org>",
        to: notifyTo,
        replyTo: contactEmail,
        subject: `New Organization Request: ${organizationName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>New School / Theater Workspace Request</h2>
            <p><strong>Organization:</strong> ${organizationName}</p>
            <p><strong>Suggested Subdomain:</strong> ${suggestedSlug}.open-backstage.org</p>
            <p><strong>Type:</strong> ${payload.organizationType || "Theater / School"}</p>
            <p><strong>Contact:</strong> ${contactName} (${contactEmail})</p>
            <p><strong>Notes:</strong> ${payload.notes || "None"}</p>
          </div>
        `,
      });
    } catch (err) {
      console.error("[Onboarding Request] Email notification failed:", err);
    }
  }

  return {
    success: true,
    suggestedSlug,
    message: `Request received for ${organizationName} (${suggestedSlug}.open-backstage.org). We'll follow up at ${contactEmail}.`,
  };
}

export async function createInstantOrganization(payload: {
  organizationName: string;
  desiredSlug?: string;
  organizationType?: string;
  notes?: string;
}) {
  const session = await auth();
  const creatorEmail = session?.user?.email?.trim().toLowerCase();
  const creatorName = session?.user?.name?.trim() || creatorEmail || "Admin";

  if (!creatorEmail) {
    return {
      success: false as const,
      error: "Please sign in first to instantly create a live workspace.",
    };
  }

  if (!isPostgresEnabled()) {
    return {
      success: false as const,
      error: "Instant workspace provisioning requires PostgreSQL to be enabled.",
    };
  }

  const organizationName = (payload.organizationName || "").trim();
  if (organizationName.length < 2) {
    return {
      success: false as const,
      error: "Please enter your school or theater name.",
    };
  }

  const slugResult = normalizeAndValidateOrgSlug(payload.desiredSlug, organizationName);
  if (!slugResult.valid) {
    return { success: false as const, error: slugResult.error };
  }

  const provisioned = await provisionOrganizationPg({
    organizationName,
    slug: slugResult.slug,
    organizationType: payload.organizationType || "Theater",
    creatorEmail,
    creatorName,
    notes: payload.notes,
  });

  if (!provisioned.success) {
    return { success: false as const, error: provisioned.error };
  }

  const headerStore = await headers();
  const host = headerStore.get("host") || "localhost:3001";
  const token = createHandoffToken({
    email: creatorEmail,
    name: creatorName,
    tenant: provisioned.organization.slug,
  });

  const launchUrl = buildTenantUrl(
    provisioned.organization.slug,
    host,
    `/api/auth/handoff?token=${encodeURIComponent(token)}`
  );

  return {
    success: true as const,
    slug: provisioned.organization.slug,
    name: provisioned.organization.name,
    launchUrl,
  };
}
