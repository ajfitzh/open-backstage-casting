// app/api/classes/checkout/route.ts
// Public Academy Class Registration & Stripe Tuition Checkout (with Waitlist support).

import { NextRequest, NextResponse } from "next/server";
import { isPostgresEnabled } from "@/db";
import { getStripeClient } from "@/app/lib/stripe-helpers";
import {
  enrollStudentInClassPg,
  findOrCreateClassStudentPg,
  listPublicClassesPg,
} from "@/app/lib/db/phase3-repo";

export async function POST(req: NextRequest) {
  if (!isPostgresEnabled()) {
    return NextResponse.json({ error: "Academy registration requires PostgreSQL." }, { status: 503 });
  }

  try {
    const body = await req.json();
    const tenant = typeof body.tenant === "string" ? body.tenant.trim().toLowerCase() : "";
    const classId = Number(body.classId);
    const studentName = typeof body.studentName === "string" ? body.studentName.trim() : "";
    const studentEmail = typeof body.studentEmail === "string" ? body.studentEmail.trim().toLowerCase() : "";
    const parentEmail = typeof body.parentEmail === "string" ? body.parentEmail.trim().toLowerCase() : "";

    if (!tenant || !Number.isInteger(classId) || classId <= 0) {
      return NextResponse.json({ error: "Valid tenant and classId are required." }, { status: 400 });
    }
    if (studentName.length < 2) {
      return NextResponse.json({ error: "Please enter the student's full name." }, { status: 400 });
    }
    if (!studentEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentEmail)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const catalog = await listPublicClassesPg(tenant);
    if (!catalog) {
      return NextResponse.json({ error: "Organization not found." }, { status: 404 });
    }

    const targetClass = catalog.classes.find((c) => c.id === classId);
    if (!targetClass) {
      return NextResponse.json({ error: "Class not found or no longer open." }, { status: 404 });
    }

    if (targetClass.isFull && !targetClass.canWaitlist) {
      return NextResponse.json({ error: "This class is currently full." }, { status: 400 });
    }

    const studentRes = await findOrCreateClassStudentPg(tenant, {
      studentName,
      studentEmail,
      parentEmail: parentEmail || studentEmail,
    });
    if (!studentRes) {
      return NextResponse.json({ error: "Unable to create student profile." }, { status: 500 });
    }

    // Full class -> Join Waitlist immediately (no tuition charged yet)
    if (targetClass.isFull) {
      const waitRes = await enrollStudentInClassPg(tenant, {
        classId: targetClass.id,
        studentId: studentRes.person.id,
        status: "waitlisted",
        paidCents: 0,
      });
      if (!waitRes.success) {
        return NextResponse.json({ error: waitRes.error }, { status: 400 });
      }
      return NextResponse.json({
        enrolled: true,
        status: "waitlisted",
        className: targetClass.className,
      });
    }

    // Free class ($0 tuition) -> Enroll immediately
    if (!targetClass.tuitionCents || targetClass.tuitionCents <= 0) {
      const enrollRes = await enrollStudentInClassPg(tenant, {
        classId: targetClass.id,
        studentId: studentRes.person.id,
        status: "enrolled",
        paidCents: 0,
      });
      if (!enrollRes.success) {
        return NextResponse.json({ error: enrollRes.error }, { status: 400 });
      }
      return NextResponse.json({
        enrolled: true,
        status: "enrolled",
        className: targetClass.className,
      });
    }

    // Paid class -> Stripe Checkout Session
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
    const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const origin = `${proto}://${host}`;

    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: parentEmail || studentEmail,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${catalog.org.name} — ${targetClass.className}`,
              description: [targetClass.day, targetClass.timeSlot, `Student: ${studentName}`]
                .filter(Boolean)
                .join(" • "),
            },
            unit_amount: targetClass.tuitionCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: "class_enrollment",
        tenant: catalog.org.slug,
        classId: String(targetClass.id),
        studentId: String(studentRes.person.id),
        paidCents: String(targetClass.tuitionCents),
      },
      success_url: `${origin}/classes?enrolled=1&class=${encodeURIComponent(targetClass.className)}`,
      cancel_url: `${origin}/classes?canceled=1`,
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err: any) {
    console.error("[Classes Checkout] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Unable to complete class registration." },
      { status: 500 }
    );
  }
}
