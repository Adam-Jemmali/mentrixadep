"use server";

import { requireRole } from "@/shared/core/auth";
import { createAdminClient } from "@/shared/integrations/supabase/admin";
import { revalidatePath } from "next/cache";
import { validateUUID, sanitizeError } from "@/shared/core/security";
import { trackEvent } from "@/shared/integrations/analytics";
import { sendSessionBookedEmail, type SessionEmailDetails } from "@/shared/integrations/email";
import { getVerifiedPaymentIntentForBooking, refundPaidCheckoutSession } from "@/shared/integrations/stripe/session-booking";
import { claimAvailabilityForPaidCheckout } from "@/shared/integrations/stripe/booking-sync";

export async function bookSession(availabilityId: string) {
  try {
    const user = await requireRole(["student", "admin"]);
    return bookSessionAsUser(availabilityId, user.id);
  } catch (error) {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (
        message.includes("already have") ||
        message.includes("cannot book") ||
        message.includes("not approved") ||
        message.includes("not found") ||
        message.includes("rate limit") ||
        message.includes("invalid")
      ) {
        throw error;
      }
    }
    throw new Error(sanitizeError(error));
  }
}

export type BookSessionAsUserOptions = {
  /** When set, stores Stripe IDs on `session_requests` for automatic refund if tutor rejects. */
  stripeCheckoutSessionId?: string;
  /** Staging smoke only: skip live Stripe Checkout retrieval when the caller already validated the event. */
  skipStripeVerification?: boolean;
};

/**
 * Internal version of bookSession that accepts a userId directly.
 * Used by the Stripe webhook handler (unauthenticated context).
 */
export async function bookSessionAsUser(
  availabilityId: string,
  studentId: string,
  options?: BookSessionAsUserOptions
) {
  try {
    const adminClient = createAdminClient();

    const validAvailabilityId = validateUUID(availabilityId);
    const validStudentId = validateUUID(studentId);

    if (options?.stripeCheckoutSessionId) {
      const { data: existingByStripe } = await adminClient
        .from("session_requests")
        .select("*")
        .eq("stripe_checkout_session_id", options.stripeCheckoutSessionId)
        .maybeSingle();
      if (existingByStripe) {
        if (
          existingByStripe.student_id !== validStudentId ||
          existingByStripe.availability_id !== validAvailabilityId
        ) {
          throw new Error("Checkout session does not match this booking");
        }
        revalidatePath("/student");
        revalidatePath("/tutor");
        return { success: true, request: existingByStripe };
      }
    }

    const { data: availability, error: availError } = await adminClient
      .from("availability")
      .select("*")
      .eq("id", validAvailabilityId)
      .single();

    if (availError) {
      if (availError.code === "PGRST116") {
        throw new Error("Availability not found");
      }
      throw new Error(`Failed to fetch availability: ${availError.message}`);
    }

    if (!availability) {
      throw new Error("Availability not found");
    }

    if ((availability as { active?: boolean }).active === false) {
      throw new Error("This open slot is not accepting bookings");
    }

    // Verify tutor is approved
    const { data: tutor, error: tutorError } = await adminClient
      .from("users")
      .select("id, role, approved")
      .eq("id", availability.tutor_id)
      .single();

    if (tutorError) {
      throw new Error(`Failed to verify tutor: ${tutorError.message}`);
    }

    if (!tutor || !tutor.approved) {
      throw new Error("Tutor is not approved");
    }

    if (new Date(availability.start_time) <= new Date()) {
      throw new Error("Cannot book past availability");
    }

    // Check for student double-booking
    const { data: existingSession } = await adminClient
      .from("sessions")
      .select("id")
      .eq("student_id", validStudentId)
      .eq("start_time", availability.start_time)
      .single();

    if (existingSession) {
      throw new Error("You already have a session at this time");
    }

    // Check for duplicate pending request
    const { data: existingRequest } = await adminClient
      .from("session_requests")
      .select("id")
      .eq("student_id", validStudentId)
      .eq("availability_id", validAvailabilityId)
      .eq("status", "pending")
      .single();

    if (existingRequest) {
      throw new Error("You already have a pending request for this availability");
    }

    let stripeCheckoutSessionId: string | null = null;
    let stripePaymentIntentId: string | null = null;
    let stripeDestinationCharge = false;
    if (options?.stripeCheckoutSessionId && !options.skipStripeVerification) {
      const verified = await getVerifiedPaymentIntentForBooking(
        options.stripeCheckoutSessionId,
        {
          availabilityId: validAvailabilityId,
          studentId: validStudentId,
        }
      );
      const claim = await claimAvailabilityForPaidCheckout(
        validAvailabilityId,
        verified.checkoutSessionId,
        validStudentId
      );
      if (!claim.ok) {
        await refundPaidCheckoutSession(options.stripeCheckoutSessionId);
        throw new Error(
          "This slot was booked by another learner before your payment finished. Your payment has been refunded automatically — please choose another time."
        );
      }
      stripeCheckoutSessionId = verified.checkoutSessionId;
      stripePaymentIntentId = verified.paymentIntentId;
      stripeDestinationCharge = verified.destinationCharge;
    } else if (options?.stripeCheckoutSessionId) {
      stripeCheckoutSessionId = options.stripeCheckoutSessionId;
    }

    // Create session request
    const { data: request, error: requestError } = await adminClient
      .from("session_requests")
      .insert({
        student_id: validStudentId,
        tutor_id: availability.tutor_id,
        availability_id: validAvailabilityId,
        status: "pending",
        stripe_checkout_session_id: stripeCheckoutSessionId,
        stripe_payment_intent_id: stripePaymentIntentId,
        stripe_destination_charge: stripeDestinationCharge,
      })
      .select()
      .single();

    if (requestError) {
      if (
        requestError.code === "23505" &&
        options?.stripeCheckoutSessionId
      ) {
        const { data: raced } = await adminClient
          .from("session_requests")
          .select("*")
          .eq("stripe_checkout_session_id", options.stripeCheckoutSessionId)
          .maybeSingle();
        if (
          raced &&
          raced.student_id === validStudentId &&
          raced.availability_id === validAvailabilityId
        ) {
          revalidatePath("/student");
          revalidatePath("/tutor");
          return { success: true, request: raced };
        }
      }
      if (requestError.code === "23505") {
        throw new Error("You already have a pending request for this availability");
      }
      if (requestError.code === "23503") {
        throw new Error("Invalid availability or tutor");
      }
      throw new Error(`Failed to create session request: ${requestError.message}`);
    }

    if (!request) {
      throw new Error("Failed to create session request");
    }

    // Fire-and-forget email notifications
    try {
      const [studentAuthData, tutorAuthData, settingsResult] = await Promise.all([
        adminClient.auth.admin.getUserById(validStudentId),
        adminClient.auth.admin.getUserById(availability.tutor_id),
        adminClient
          .from("user_settings")
          .select("user_id, display_name")
          .in("user_id", [validStudentId, availability.tutor_id]),
      ]);
      const studentEmail = studentAuthData.data?.user?.email;
      const tutorEmail = tutorAuthData.data?.user?.email;
      const nameByUser = Object.fromEntries(
        (settingsResult.data ?? []).map((r) => [r.user_id, r.display_name as string | null])
      );
      if (studentEmail && tutorEmail) {
        const priceCents =
          (availability as { price_per_session?: number | null }).price_per_session ?? null;
        const sessionDetails: SessionEmailDetails = {
          sessionId: request.id,
          course: availability.course,
          startTime: availability.start_time,
          endTime: availability.end_time,
          studentDisplayName: nameByUser[validStudentId] ?? null,
          tutorDisplayName: nameByUser[availability.tutor_id] ?? null,
          priceCents,
        };
        void sendSessionBookedEmail(studentEmail, tutorEmail, sessionDetails);
      }
    } catch (emailErr) {
      console.error("[bookSessionAsUser] email notification failed:", emailErr);
    }

    // Track booking events
    void trackEvent("session_booked", {
      userId: studentId,
      properties: {
        course: String(availability.course ?? ""),
        tutor_id: String(availability.tutor_id ?? ""),
      },
    });
    // Check if this is the student's first booked session
    try {
      const { count } = await adminClient
        .from("session_requests")
        .select("id", { count: "exact", head: true })
        .eq("student_id", studentId)
        .eq("status", "approved");
      if ((count ?? 0) <= 1) {
        void trackEvent("first_session_booked", { userId: studentId });
      }
    } catch { /* non-critical */ }

    revalidatePath("/student");
    revalidatePath("/tutor");
    return { success: true, request };
  } catch (error) {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (
        message.includes("already have") ||
        message.includes("cannot book") ||
        message.includes("not approved") ||
        message.includes("not found") ||
        message.includes("rate limit") ||
        message.includes("invalid") ||
        message.includes("checkout") ||
        message.includes("another learner")
      ) {
        throw error;
      }
    }
    throw new Error(sanitizeError(error));
  }
}
