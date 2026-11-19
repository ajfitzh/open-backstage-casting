import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { fetchBaserow, getDB } from '@/app/lib/baserow';
import { getTenantTableConfig } from '@/app/lib/tenant-config';
import { getStripeClient, parseCheckoutMetadata } from '@/app/lib/stripe-helpers';

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[Stripe Webhook] Missing STRIPE_WEBHOOK_SECRET.');
    return NextResponse.json({ error: 'Webhook secret not configured.' }, { status: 500 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header.' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await req.text();
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    console.error('[Stripe Webhook] Signature verification failed:', err?.message);
    return NextResponse.json({ error: 'Invalid Stripe signature.' }, { status: 400 });
  }

  if (
    event.type === 'checkout.session.completed' ||
    event.type === 'checkout.session.async_payment_succeeded'
  ) {
    const session = event.data.object as Stripe.Checkout.Session;

    // Only mark paid when Stripe confirms payment is settled
    if (event.type === 'checkout.session.completed' && session.payment_status !== 'paid') {
      return NextResponse.json({ received: true, skipped: 'payment_pending' });
    }

    const parsed = parseCheckoutMetadata(session.metadata);
    if (!parsed) {
      // Sandbox or unrelated Stripe session without Open Backstage metadata
      return NextResponse.json({ received: true, skipped: 'no_audition_metadata' });
    }

    try {
      const DB = getDB(parsed.tenant);
      const tables = await getTenantTableConfig(parsed.tenant);
      const F = DB.AUDITIONS.FIELDS;

      const patchRes = await fetchBaserow(
        `/database/rows/table/${tables.AUDITIONS}/${parsed.auditionId}/`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            [F.PAID_FEES]: true,
            [F.PRODUCTION_FEE_STATUS]: 'Paid',
          }),
        },
        {},
        parsed.tenant
      );

      if (!patchRes || patchRes.error) {
        console.error('[Stripe Webhook] Failed to update Baserow audition row:', patchRes);
        return NextResponse.json({ error: 'Failed to update Baserow record.' }, { status: 500 });
      }

      return NextResponse.json({
        received: true,
        updated: { tenant: parsed.tenant, auditionId: parsed.auditionId },
      });
    } catch (error) {
      console.error('[Stripe Webhook] Baserow update error:', error);
      return NextResponse.json({ error: 'Failed to process payment fulfillment.' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
