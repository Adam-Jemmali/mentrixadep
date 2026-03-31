import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { getStripeSecretKey } from "@/lib/env";
import { env } from "@/lib/env";

export async function POST(req: NextRequest) {
  try {
    const { availabilityId } = (await req.json()) as {
      availabilityId: string;
    };

    if (!availabilityId) {
      return NextResponse.json(
        { error: "availabilityId is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: availability, error: availError } = await supabase
      .from("availability")
      .select("id, course, start_time, end_time, tutor_id, price_per_session")
      .eq("id", availabilityId)
      .single();

    if (availError || !availability) {
      return NextResponse.json(
        { error: "Availability not found" },
        { status: 404 }
      );
    }

    if (new Date(availability.start_time) <= new Date()) {
      return NextResponse.json(
        { error: "Cannot book past availability" },
        { status: 400 }
      );
    }

    const { data: existingRequest } = await supabase
      .from("session_requests")
      .select("id, status")
      .eq("student_id", user.id)
      .eq("availability_id", availabilityId)
      .in("status", ["pending", "approved"])
      .maybeSingle();

    if (existingRequest) {
      const message =
        existingRequest.status === "pending"
          ? "You already have a pending request for this slot. Awaiting tutor approval."
          : "This slot is already booked.";
      return NextResponse.json({ error: message }, { status: 409 });
    }

    const priceInCents: number = availability.price_per_session ?? 2500;

    const appUrl = env.public.appUrl;
    const sessionDate = new Date(availability.start_time).toLocaleDateString(
      "en-US",
      { dateStyle: "medium" }
    );

    const stripe = new Stripe(getStripeSecretKey());

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: priceInCents,
            product_data: {
              name: `${availability.course} tutoring session`,
              description: `${sessionDate} · 30 min`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        availabilityId: availability.id,
        studentId: user.id,
        tutorId: availability.tutor_id,
      },
      success_url: `${appUrl}/api/stripe/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/student?booking=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[stripe/checkout] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
