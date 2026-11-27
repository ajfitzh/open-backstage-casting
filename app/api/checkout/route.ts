import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getCheckoutDetailsPg } from '@/app/lib/db/operations-repo';
import {
  buildCheckoutLineItems,
  getStripeClient,
  sanitizeReturnPath,
} from '@/app/lib/stripe-helpers';

export async function POST(req: NextRequest) {
  const sessionAuth = await auth();
  const sandboxCookie = req.cookies.get('sandbox_access')?.value;
  const hasSandboxAccess =
    Boolean(process.env.SANDBOX_PASSWORD) && sandboxCookie === process.env.SANDBOX_PASSWORD;

  if (!sessionAuth?.user && !hasSandboxAccess) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const origin = req.headers.get('origin') || 'http://localhost:3001';
    const stripe = getStripeClient();

    // 1. SANDBOX DEMO MODE (keeps /sandbox/checkout working)
    const isSandboxRequest =
      Boolean(body?.sandbox) || (!body?.auditionId && !body?.productionId && hasSandboxAccess);

    if (isSandboxRequest) {
      const lineItems = buildCheckoutLineItems({
        showTitle: 'Spring Musical (Sandbox Demo)',
        studentName: 'Sandbox Student',
        productionFeeDollars: 150,
        extraItems: [{ name: 'Show T-Shirt', description: 'Adult L', amountDollars: 20 }],
      });

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${origin}/sandbox/checkout?status=success`,
        cancel_url: `${origin}/sandbox/checkout?status=cancelled`,
      });

      return NextResponse.json({ url: session.url });
    }

    // 2. REAL PRODUCTION FEE CHECKOUT
    if (!sessionAuth?.user) {
      return NextResponse.json({ error: 'Please sign in to pay production fees.' }, { status: 401 });
    }

    const tenant = typeof body?.tenant === 'string' ? body.tenant.trim() : '';
    const auditionId = Number(body?.auditionId);
    const productionId = Number(body?.productionId);

    if (!tenant || !Number.isInteger(auditionId) || auditionId <= 0 || !Number.isInteger(productionId) || productionId <= 0) {
      return NextResponse.json(
        { error: 'Missing or invalid tenant, auditionId, or productionId.' },
        { status: 400 }
      );
    }

    const pgDetails = await getCheckoutDetailsPg(tenant, productionId, auditionId);
    if (!pgDetails) {
      return NextResponse.json({ error: 'Production or audition record not found.' }, { status: 404 });
    }
    if (pgDetails.error) {
      return NextResponse.json({ error: pgDetails.error }, { status: pgDetails.status });
    }
    if (pgDetails.paidFees) {
      return NextResponse.json(
        { error: 'Production fee has already been paid for this student.' },
        { status: 409 }
      );
    }

    const showTitle = pgDetails.showTitle ?? 'Production';
    const productionFeeDollars = pgDetails.productionFeeDollars ?? 0;
    const studentName = pgDetails.studentName ?? 'Cast Member';
    const studentId = pgDetails.studentId ?? '';

    if (!Number.isFinite(productionFeeDollars) || productionFeeDollars <= 0) {
      return NextResponse.json(
        { error: `No production fee is configured for "${showTitle}". Please contact your administrator.` },
        { status: 400 }
      );
    }

    const lineItems = buildCheckoutLineItems({
      showTitle: String(showTitle),
      studentName: String(studentName),
      productionFeeDollars,
    });

    const returnPath = sanitizeReturnPath(body?.returnPath, '/');
    const separator = returnPath.includes('?') ? '&' : '?';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: sessionAuth.user.email || undefined,
      line_items: lineItems,
      mode: 'payment',
      metadata: {
        tenant,
        auditionId: String(auditionId),
        productionId: String(productionId),
        ...(studentId ? { studentId } : {}),
      },
      success_url: `${origin}${returnPath}${separator}payment=success&auditionId=${auditionId}`,
      cancel_url: `${origin}${returnPath}${separator}payment=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating Stripe checkout session:', error);
    return NextResponse.json(
      { error: error?.message || 'Unable to start Stripe checkout.' },
      { status: 500 }
    );
  }
}
