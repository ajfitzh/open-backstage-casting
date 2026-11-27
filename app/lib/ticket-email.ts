// app/lib/ticket-email.ts
// Sends QR ticket confirmation emails via Resend after Stripe payment completes.

import { Resend } from "resend";
import { markTicketOrderEmailSentPg } from "@/app/lib/db/tickets-repo";

export interface TicketEmailPayload {
  orderId: number;
  orgName: string;
  orgSlug: string;
  productionTitle: string;
  productionLocation: string;
  performanceLabel: string;
  performanceDate: string;
  buyerName: string;
  buyerEmail: string;
  totalCents: number;
  stripeSessionId: string | null;
  tickets: { code: string; holderName: string | null }[];
}

function buildTenantOrderUrl(orgSlug: string, stripeSessionId: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL;
  if (base) {
    try {
      const parsed = new URL(base);
      const host = parsed.host.replace(/^www\./, "");
      return `${parsed.protocol}//${orgSlug}.${host}/tickets/order/${encodeURIComponent(stripeSessionId)}`;
    } catch {
      // fall through
    }
  }
  return `https://${orgSlug}.open-backstage.org/tickets/order/${encodeURIComponent(stripeSessionId)}`;
}

export async function sendTicketConfirmationEmail(payload: TicketEmailPayload) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[TicketEmail] RESEND_API_KEY not configured; skipping email.");
    return { sent: false as const, reason: "missing_api_key" };
  }

  const fromAddress =
    process.env.EMAIL_FROM_ADDRESS || "Box Office <boxoffice@open-backstage.org>";
  const ticketsUrl = payload.stripeSessionId
    ? buildTenantOrderUrl(payload.orgSlug, payload.stripeSessionId)
    : null;

  const totalFormatted = `$${(payload.totalCents / 100).toFixed(2)}`;
  const ticketListHtml = payload.tickets
    .map(
      (t, idx) => `
      <div style="border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px 14px; margin-bottom: 8px; background: #f9fafb;">
        <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: 700;">
          Ticket ${idx + 1} of ${payload.tickets.length}
        </div>
        <div style="font-size: 16px; font-weight: 800; color: #111827; font-family: ui-monospace, monospace; margin-top: 2px;">
          ${t.code}
        </div>
        <div style="font-size: 13px; color: #374151;">${t.holderName || payload.buyerName}</div>
      </div>`
    )
    .join("");

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 14px; color: #1f2937;">
      <p style="margin: 0; font-size: 11px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: #2563eb;">
        ${payload.orgName} • Box Office Confirmation
      </p>
      <h1 style="margin: 6px 0 4px; font-size: 24px; color: #111827;">
        ${payload.productionTitle}
      </h1>
      <p style="margin: 0 0 18px; font-size: 14px; color: #4b5563;">
        <strong>${payload.performanceLabel}</strong>${payload.performanceDate ? ` • ${payload.performanceDate}` : ""}<br/>
        ${payload.productionLocation}
      </p>

      ${
        ticketsUrl
          ? `<div style="margin: 20px 0; text-align: center;">
              <a href="${ticketsUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 24px; border-radius: 10px; font-size: 14px; font-weight: 800;">
                🎟️ Open Mobile QR Tickets
              </a>
              <p style="margin: 8px 0 0; font-size: 12px; color: #6b7280;">
                Show your QR codes on your phone or print them at home for fast scanning at the door.
              </p>
            </div>`
          : ""
      }

      <div style="margin-top: 18px;">
        <h3 style="margin: 0 0 10px; font-size: 12px; text-transform: uppercase; color: #6b7280;">
          Your General Admission Tickets (${payload.tickets.length})
        </h3>
        ${ticketListHtml}
      </div>

      <p style="margin-top: 18px; font-size: 13px; color: #4b5563;">
        <strong>Order #${payload.orderId}</strong> • Paid ${totalFormatted} • Purchased by ${payload.buyerName}
      </p>
      <p style="font-size: 11px; color: #9ca3af; margin-top: 20px; text-align: center;">
        Powered by Open Backstage Box Office
      </p>
    </div>
  `;

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: fromAddress,
      to: payload.buyerEmail,
      subject: `🎟️ Your Tickets: ${payload.productionTitle} — ${payload.performanceLabel}`,
      html,
    });
    if (error) {
      console.error("[TicketEmail] Resend error:", error);
      return { sent: false as const, reason: error.message };
    }
    await markTicketOrderEmailSentPg(payload.orderId);
    return { sent: true as const };
  } catch (err: any) {
    console.error("[TicketEmail] Failed:", err);
    return { sent: false as const, reason: err?.message || "send_error" };
  }
}
