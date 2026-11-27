import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { fetchBaserow, getDB } from '@/app/lib/baserow';
import { getTenantTableConfig } from '@/app/lib/tenant-config';
import { getStripeClient, parseCheckoutMetadata } from '@/app/lib/stripe-helpers';
import {
  parseBillingMetadata,
  resolvePlanFromSubscriptionStatus,
} from '@/app/lib/billing-plans';
import { isPostgresEnabled } from '@/db';
import { markAuditionPaidPg } from '@/app/lib/db/casting-repo';
import { updateOrganizationBillingPg } from '@/app/lib/db/core-repo';
import { fulfillTicketOrderPg } from '@/app/lib/db/tickets-repo';
import { parseTicketOrderMetadata } from '@/app/lib/ticketing-helpers';
import { sendTicketConfirmationEmail } from '@/app/lib/ticket-email';
import { parseClassEnrollmentMetadata } from '@/app/lib/phase3-helpers';
import { enrollStudentInClassPg } from '@/app/lib/db/phase3-repo';

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

  // 1. ORGANIZATION SAAS SUBSCRIPTION LIFECYCLE
  if (
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    const subscription = event.data.object as Stripe.Subscription;
    const billingMeta = parseBillingMetadata(subscription.metadata);
    if (!billingMeta || !isPostgresEnabled()) {
      return NextResponse.json({ received: true, skipped: 'no_org_subscription_metadata' });
    }

    const effectivePlan =
      event.type === 'customer.subscription.deleted'
        ? 'starter'
        : resolvePlanFromSubscriptionStatus(subscription.status, billingMeta.planId);

    const periodEndUnix = (subscription as any).current_period_end;
    const currentPeriodEnd =
      typeof periodEndUnix === 'number' ? new Date(periodEndUnix * 1000).toISOString() : null;

    await updateOrganizationBillingPg(billingMeta.tenant, {
      plan: effectivePlan,
      stripeCustomerId:
        typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer?.id || null,
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      currentPeriodEnd,
    });

    return NextResponse.json({
      received: true,
      updatedOrg: { tenant: billingMeta.tenant, plan: effectivePlan, status: subscription.status },
    });
  }

  // 2. CHECKOUT SESSION COMPLETION (SaaS Subscription OR Cast Production Fee)
  if (
    event.type === 'checkout.session.completed' ||
    event.type === 'checkout.session.async_payment_succeeded'
  ) {
    const session = event.data.object as Stripe.Checkout.Session;

    // 2A. Organization SaaS Subscription Checkout
    const billingMeta = parseBillingMetadata(session.metadata);
    if (billingMeta && session.mode === 'subscription') {
      if (isPostgresEnabled()) {
        await updateOrganizationBillingPg(billingMeta.tenant, {
          plan: billingMeta.planId,
          stripeCustomerId:
            typeof session.customer === 'string'
              ? session.customer
              : session.customer?.id || null,
          stripeSubscriptionId:
            typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription?.id || null,
          subscriptionStatus: 'active',
        });
      }
      return NextResponse.json({
        received: true,
        updatedOrg: { tenant: billingMeta.tenant, plan: billingMeta.planId },
      });
    }

    // 2B. General Admission Ticket Order Checkout
    const ticketMeta = parseTicketOrderMetadata(session.metadata);
    if (ticketMeta) {
      if (event.type === 'checkout.session.completed' && session.payment_status !== 'paid') {
        return NextResponse.json({ received: true, skipped: 'ticket_payment_pending' });
      }
      if (!isPostgresEnabled()) {
        return NextResponse.json({ error: 'PostgreSQL required for ticket fulfillment.' }, { status: 500 });
      }

      const paymentIntentId =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id || null;

      const fulfilled = await fulfillTicketOrderPg(
        ticketMeta.tenant,
        ticketMeta.orderId,
        paymentIntentId
      );
      if (!fulfilled.success) {
        console.error('[Stripe Webhook] Ticket fulfillment failed:', fulfilled.error);
        return NextResponse.json({ error: fulfilled.error }, { status: 500 });
      }

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

      return NextResponse.json({
        received: true,
        fulfilledTicketOrder: {
          tenant: ticketMeta.tenant,
          orderId: ticketMeta.orderId,
          ticketCount: fulfilled.tickets.length,
        },
      });
    }

    // 2B-2. Academy Class Tuition Enrollment Checkout
    const classMeta = parseClassEnrollmentMetadata(session.metadata);
    if (classMeta) {
      if (event.type === 'checkout.session.completed' && session.payment_status !== 'paid') {
        return NextResponse.json({ received: true, skipped: 'class_payment_pending' });
      }
      if (isPostgresEnabled()) {
        const res = await enrollStudentInClassPg(classMeta.tenant, {
          classId: classMeta.classId,
          studentId: classMeta.studentId,
          status: 'enrolled',
          paidCents: classMeta.paidCents,
          stripeSessionId: session.id,
        });
        if (!res.success) {
          return NextResponse.json({ error: res.error }, { status: 500 });
        }
      }
      return NextResponse.json({
        received: true,
        enrolledClass: { tenant: classMeta.tenant, classId: classMeta.classId, studentId: classMeta.studentId },
      });
    }

    // 2C. Cast Production Fee Payment
    if (event.type === 'checkout.session.completed' && session.payment_status !== 'paid') {
      return NextResponse.json({ received: true, skipped: 'payment_pending' });
    }

    const parsed = parseCheckoutMetadata(session.metadata);
    if (!parsed) {
      return NextResponse.json({ received: true, skipped: 'no_audition_metadata' });
    }

    try {
      if (isPostgresEnabled()) {
        const pgRes = await markAuditionPaidPg(parsed.tenant, parsed.auditionId);
        if (!pgRes.success) {
          console.error('[Stripe Webhook] Failed to update Postgres audition row:', pgRes.error);
          return NextResponse.json({ error: pgRes.error }, { status: 500 });
        }
        return NextResponse.json({
          received: true,
          updated: { tenant: parsed.tenant, auditionId: parsed.auditionId },
        });
      }

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
      console.error('[Stripe Webhook] Payment fulfillment error:', error);
      return NextResponse.json({ error: 'Failed to process payment fulfillment.' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
