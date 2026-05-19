export type OnboardingRole = "student" | "tutor";

export type OnboardingRequestOutcome =
  | "requested"
  | "pending_review"
  | "approved"
  | "rejected"
  | "error";

export type OnboardingRequestResult = {
  outcome: OnboardingRequestOutcome;
  message?: string;
  error?: string;
};

type JoinJson = {
  ok?: boolean;
  approved?: boolean;
  error?: string;
  message?: string;
  status?: "pending" | "approved" | "rejected";
  confirmationEmailSent?: boolean;
};

function roleLabel(role: OnboardingRole): string {
  return role === "tutor" ? "Guide" : "Mentrixer";
}

/**
 * Submits an onboarding access request (same as landing hero "Start climb").
 * POST /api/waitlist/join → registration_requests + "Onboarding request received" email.
 */
export async function submitOnboardingRequest(
  email: string,
  role: OnboardingRole,
): Promise<OnboardingRequestResult> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { outcome: "error", error: "Please enter a valid email." };
  }

  try {
    const res = await fetch("/api/waitlist/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normalized, role }),
    });
    const json = (await res.json().catch(() => ({}))) as JoinJson;

    if (!res.ok) {
      if (json.status === "pending") {
        return {
          outcome: "pending_review",
          message:
            json.message ??
            json.error ??
            `Your ${roleLabel(role)} access request is already pending review. Check your email for "Onboarding request received".`,
        };
      }
      if (json.status === "rejected") {
        return {
          outcome: "rejected",
          error:
            json.error ??
            `Your ${roleLabel(role)} access request was not approved. Contact support@mentrixa.one if this seems incorrect.`,
        };
      }
      return {
        outcome: "error",
        error: json.error ?? "Could not start access request. Please try again.",
      };
    }

    if (json.approved || json.status === "approved") {
      return {
        outcome: "approved",
        message:
          json.message ??
          `You are already approved as a ${roleLabel(role)}. Continue with account setup using this email.`,
      };
    }

    return {
      outcome: "requested",
      message:
        json.message ??
        `You're in onboarding as a ${roleLabel(role)}. Check your email for "Onboarding request received" (and spam). We will email again when an admin approves your access.`,
    };
  } catch {
    return { outcome: "error", error: "Could not start access request. Please try again." };
  }
}
