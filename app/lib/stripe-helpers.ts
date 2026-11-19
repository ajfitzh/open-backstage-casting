import Stripe from 'stripe';

export interface CheckoutLineItemInput {
  showTitle: string;
  studentName: string;
  productionFeeDollars: number;
  extraItems?: { name: string; description?: string; amountDollars: number; quantity?: number }[];
}

export interface ParsedCheckoutMetadata {
  tenant: string;
  auditionId: number;
  productionId: number | null;
  studentId: number | null;
}

export function getStripeClient(): Stripe {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error('Missing STRIPE_SECRET_KEY environment variable.');
  }
  return new Stripe(apiKey, {
    apiVersion: '2026-04-22.dahlia',
  });
}

export function dollarsToCents(dollars: number): number {
  if (!Number.isFinite(dollars) || dollars < 0) {
    throw new Error('Amount must be a finite non-negative number.');
  }
  return Math.round(dollars * 100);
}

type CheckoutLineItem = NonNullable<
  NonNullable<Parameters<Stripe['checkout']['sessions']['create']>[0]>['line_items']
>[number];

export function buildCheckoutLineItems(
  input: CheckoutLineItemInput
): CheckoutLineItem[] {
  const showTitle = (input.showTitle || 'Production').trim();
  const studentName = (input.studentName || 'Cast Member').trim();
  const feeCents = dollarsToCents(input.productionFeeDollars);

  if (feeCents <= 0) {
    throw new Error('Production fee must be greater than $0.00.');
  }

  const lineItems: CheckoutLineItem[] = [
    {
      price_data: {
        currency: 'usd',
        product_data: {
          name: `${showTitle} — Production Fee`,
          description: `Cast participation fee for ${studentName}`,
        },
        unit_amount: feeCents,
      },
      quantity: 1,
    },
  ];

  for (const extra of input.extraItems || []) {
    const unitAmount = dollarsToCents(extra.amountDollars);
    if (unitAmount <= 0) continue;
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: extra.name.trim(),
          ...(extra.description ? { description: extra.description.trim() } : {}),
        },
        unit_amount: unitAmount,
      },
      quantity: Math.max(1, Math.floor(extra.quantity ?? 1)),
    });
  }

  return lineItems;
}

export function parseCheckoutMetadata(
  metadata: Record<string, string | null | undefined> | null | undefined
): ParsedCheckoutMetadata | null {
  if (!metadata) return null;

  const tenant = (metadata.tenant || '').trim();
  const auditionId = Number(metadata.auditionId);
  if (!tenant || !Number.isInteger(auditionId) || auditionId <= 0) {
    return null;
  }

  const rawProdId = metadata.productionId ? Number(metadata.productionId) : null;
  const rawStudentId = metadata.studentId ? Number(metadata.studentId) : null;

  return {
    tenant,
    auditionId,
    productionId: rawProdId && Number.isInteger(rawProdId) && rawProdId > 0 ? rawProdId : null,
    studentId: rawStudentId && Number.isInteger(rawStudentId) && rawStudentId > 0 ? rawStudentId : null,
  };
}

export function sanitizeReturnPath(returnPath: unknown, fallback: string = '/'): string {
  if (typeof returnPath !== 'string') return fallback;
  const trimmed = returnPath.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return fallback;
  return trimmed;
}
