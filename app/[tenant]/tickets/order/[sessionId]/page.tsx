// app/[tenant]/tickets/order/[sessionId]/page.tsx
import QRCode from "qrcode";
import Link from "next/link";
import { isPostgresEnabled } from "@/db";
import {
  fulfillTicketOrderPg,
  getTicketOrderBySessionIdPg,
} from "@/app/lib/db/tickets-repo";
import { getStripeClient } from "@/app/lib/stripe-helpers";
import { sendTicketConfirmationEmail } from "@/app/lib/ticket-email";
import OrderTicketsClient from "@/app/components/tickets/OrderTicketsClient";

export const dynamic = "force-dynamic";

export default async function TicketOrderConfirmationPage({
  params,
}: {
  params: Promise<{ tenant: string; sessionId: string }> | { tenant: string; sessionId: string };
}) {
  const { tenant, sessionId } = await params;

  if (!isPostgresEnabled() || !sessionId) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-400 flex items-center justify-center p-8">
        Unable to load ticket order.
      </div>
    );
  }

  let data = await getTicketOrderBySessionIdPg(tenant, sessionId);
  if (!data) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-8 text-center space-y-4">
        <h1 className="text-2xl font-black">Order Not Found</h1>
        <p className="text-sm text-zinc-400 max-w-md">
          We couldn&apos;t find a ticket order matching this confirmation link.
        </p>
        <Link
          href="/tickets"
          className="px-5 py-2.5 rounded-xl bg-blue-600 text-xs font-black uppercase tracking-widest"
        >
          Back to Box Office
        </Link>
      </div>
    );
  }

  // Fallback fulfillment if buyer lands here before Stripe webhook finishes
  if (data.order.status === "pending" && process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = getStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status === "paid") {
        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id || null;
        const fulfilled = await fulfillTicketOrderPg(tenant, data.order.id, paymentIntentId);
        if (fulfilled.success) {
          if (!fulfilled.alreadyFulfilled && !fulfilled.order.emailSentAt) {
            await sendTicketConfirmationEmail({
              orderId: fulfilled.order.id,
              orgName: fulfilled.orgName,
              orgSlug: fulfilled.orgSlug,
              productionTitle: fulfilled.productionTitle,
              productionLocation: fulfilled.productionLocation,
              performanceLabel: fulfilled.performanceLabel,
              performanceDate: fulfilled.performanceDate,
              buyerName: fulfilled.order.buyerName,
              buyerEmail: fulfilled.order.buyerEmail,
              totalCents: fulfilled.order.totalCents,
              stripeSessionId: fulfilled.order.stripeSessionId,
              tickets: fulfilled.tickets.map((t) => ({ code: t.code, holderName: t.holderName })),
            });
          }
          data = (await getTicketOrderBySessionIdPg(tenant, sessionId)) || data;
        }
      }
    } catch (err) {
      console.error("[TicketOrderPage] Fallback Stripe check failed:", err);
    }
  }

  const ticketsWithQr = await Promise.all(
    data.tickets.map(async (t) => ({
      id: t.id,
      code: t.code,
      holderName: t.holderName || data!.order.buyerName,
      status: t.status,
      checkedInAt: t.checkedInAt ? t.checkedInAt.toISOString() : null,
      qrDataUrl: await QRCode.toDataURL(t.qrCodeValue, {
        width: 260,
        margin: 1,
        color: { dark: "#09090b", light: "#ffffff" },
      }),
    }))
  );

  return (
    <OrderTicketsClient
      orgName={data.orgName}
      orderId={data.order.id}
      status={data.order.status}
      buyerName={data.order.buyerName}
      buyerEmail={data.order.buyerEmail}
      totalCents={data.order.totalCents}
      productionTitle={data.productionTitle}
      productionLocation={data.productionLocation}
      performanceLabel={data.performanceLabel}
      performanceDate={data.performanceDate}
      tickets={ticketsWithQr}
    />
  );
}
