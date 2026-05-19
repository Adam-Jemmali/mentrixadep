import { createAdminClient } from "@/lib/supabase/admin";
import { sendWaitlistReceivedEmail } from "@/lib/email";
import { isDisposableEmail } from "@/lib/disposable-email";
import { fetchRegistrationRequestRow } from "@/lib/registration-request-lookup";

export type RegistrationJoinRole = "student" | "tutor";

export type RegistrationJoinOutcome = "approved" | "pending" | "rejected" | "error";

export type RegistrationJoinResult = {
  outcome: RegistrationJoinOutcome;
  message?: string;
  error?: string;
  confirmationEmailSent?: boolean;
  /** True when row was already pending (resend confirmation email). */
  alreadyPending?: boolean;
};

function roleLabel(role: RegistrationJoinRole): string {
  return role === "tutor" ? "Guide" : "Mentrixer";
}

const EMAIL_RETRY_DELAYS_MS = [0, 400, 1200];

async function sendOnboardingConfirmationEmailWithRetry(
  email: string,
  role: RegistrationJoinRole,
): Promise<boolean> {
  for (const delayMs of EMAIL_RETRY_DELAYS_MS) {
    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
    const emailed = await sendWaitlistReceivedEmail(email, role);
    if (emailed) return true;
  }
  console.error("[registration-request-join] confirmation email failed after retries", { email, role });
  return false;
}

function pendingMessage(
  email: string,
  role: RegistrationJoinRole,
  emailed: boolean,
  prefix?: string,
): string {
  const label = roleLabel(role);
  const confirmationLine = emailed
    ? `We sent "Onboarding request received" to ${email}. Check spam if you do not see it.`
    : `Your request is saved; confirmation email is delayed — check back shortly or contact support@mentrixa.one.`;
  const base = `You're in onboarding as a ${label}. ${confirmationLine} We will email again when an admin approves your access.`;
  return prefix ? `${prefix} ${confirmationLine}` : base;
}

function pendingRoleFromRow(role: string | null | undefined): RegistrationJoinRole {
  return role === "tutor" ? "tutor" : "student";
}

/**
 * Creates or surfaces a pending registration_requests row and sends
 * "Onboarding request received" when appropriate. Shared by /api/waitlist/join and OAuth redirects.
 */
export async function submitRegistrationRequest(
  email: string,
  role: RegistrationJoinRole,
): Promise<RegistrationJoinResult> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { outcome: "error", error: "Valid email is required." };
  }
  if (isDisposableEmail(normalized)) {
    return {
      outcome: "error",
      error: "Temporary email addresses are not allowed. Please use a real email you can access.",
    };
  }

  const admin = createAdminClient();
  const existing = await fetchRegistrationRequestRow(admin, normalized);

  if (existing?.status === "approved") {
    const existingRole = pendingRoleFromRow(existing.role);
    if (existing.role && existingRole !== role) {
      return {
        outcome: "error",
        error: `This email is already approved as a ${roleLabel(existingRole)}. Please continue with that role or contact support@mentrixa.one if this is incorrect.`,
      };
    }
    return {
      outcome: "approved",
      message: "You are already approved. Continue with account setup using this email.",
    };
  }

  if (existing?.status === "rejected") {
    return {
      outcome: "rejected",
      error:
        "This access request was not approved, and this email cannot submit another one. Contact support@mentrixa.one if this seems incorrect.",
    };
  }

  if (existing?.status === "pending") {
    const pendingRole = pendingRoleFromRow(existing.role);
    const emailed = await sendOnboardingConfirmationEmailWithRetry(normalized, pendingRole);
    if (existing.role && pendingRoleFromRow(existing.role) !== role) {
      return {
        outcome: "pending",
        alreadyPending: true,
        confirmationEmailSent: emailed,
        message: pendingMessage(
          normalized,
          pendingRole,
          emailed,
          `This email already has a pending ${roleLabel(pendingRole)} onboarding request. You cannot switch roles until review is complete.`,
        ),
      };
    }
    return {
      outcome: "pending",
      alreadyPending: true,
      confirmationEmailSent: emailed,
      message: pendingMessage(
        normalized,
        pendingRole,
        emailed,
        "You already have a pending onboarding request. Please wait for admin review.",
      ),
    };
  }

  const { error: insertError } = await admin.from("registration_requests").insert({
    email: normalized,
    role,
    status: "pending",
  });

  if (insertError) {
    if (insertError.code === "23505") {
      const raced = await fetchRegistrationRequestRow(admin, normalized);
      if (raced?.status === "approved") {
        return {
          outcome: "approved",
          message: "You are already approved. Continue with account setup using this email.",
        };
      }
      if (raced?.status === "pending") {
        const pendingRole = pendingRoleFromRow(raced.role);
        const emailed = await sendOnboardingConfirmationEmailWithRetry(normalized, pendingRole);
        return {
          outcome: "pending",
          alreadyPending: true,
          confirmationEmailSent: emailed,
          message: pendingMessage(normalized, pendingRole, emailed),
        };
      }
    }
    console.error("[registration-request-join] insert error:", insertError.message, insertError.details);
    return { outcome: "error", error: "Could not start onboarding request. Please try again." };
  }

  const emailed = await sendOnboardingConfirmationEmailWithRetry(normalized, role);
  return {
    outcome: "pending",
    confirmationEmailSent: emailed,
    message: pendingMessage(normalized, role, emailed),
  };
}

/** Resend "Onboarding request received" (e.g. after OAuth created the DB row via auth trigger). */
export async function resendOnboardingConfirmationEmail(
  email: string,
  role: RegistrationJoinRole,
): Promise<boolean> {
  return sendOnboardingConfirmationEmailWithRetry(email.trim().toLowerCase(), role);
}
