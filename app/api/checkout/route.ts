import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Initialize Stripe. In production, ensure STRIPE_SECRET_KEY is set in your .env
// We use a fallback dummy key so the code doesn't crash on initialization if missing.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
  apiVersion: '2026-04-22.dahlia', // Use your preferred/latest API version
});

export async function POST(req: NextRequest) {
  try {
    // Determine the origin for our return URLs
    const origin = req.headers.get('origin') || 'http://localhost:3000';

    // Create a Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Spring Production Fee: Austin Fitzhugh',
              description: 'Participation fee for the Spring Musical',
            },
            unit_amount: 15000, // $150.00 (amount must be in cents)
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Show T-Shirt',
              description: 'Adult L',
            },
            unit_amount: 2000, // $20.00 (amount must be in cents)
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/sandbox/checkout?status=success`,
      cancel_url: `${origin}/sandbox/checkout?status=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating Stripe checkout session:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}