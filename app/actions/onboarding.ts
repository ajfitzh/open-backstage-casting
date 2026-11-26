"use server";

import { Resend } from "resend";

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
