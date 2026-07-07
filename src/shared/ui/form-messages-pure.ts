export type MentrixaFormMessage = {
  verdict: string;
  nextAction: string;
};

export type MentrixaSettingsProfileFieldId = "display_name" | "bio" | "email";

export type MentrixaSettingsPasswordFieldId =
  | "current_password"
  | "new_password"
  | "confirm_password";

export type MentrixaContactFieldId = "name" | "email" | "message";

export type MentrixaAdminFieldId = "mfa_code";

export function settingsProfileFieldsetMessage(): MentrixaFormMessage {
  return {
    verdict: "Your profile is what Mentrixers and Guides see before they trust you.",
    nextAction: "Keep display name and bio aligned with your public rank card.",
  };
}

export function settingsProfileFieldMessage(
  fieldId: MentrixaSettingsProfileFieldId,
): MentrixaFormMessage {
  switch (fieldId) {
    case "email":
      return {
        verdict: "Sign-in email is fixed for verified rank integrity.",
        nextAction: "Contact support if you need an address change.",
      };
    case "display_name":
      return {
        verdict: "Display name is the headline on your public card.",
        nextAction: "Use the name people already recognize in sessions.",
      };
    case "bio":
      return {
        verdict: "Bio sets context before someone books or challenges you.",
        nextAction: "Stay under 280 characters so the card stays scannable.",
      };
  }
}

export function settingsPasswordFieldsetMessage(): MentrixaFormMessage {
  return {
    verdict: "Password changes apply on your next sign-in.",
    nextAction: "Use a unique passphrase you do not reuse elsewhere.",
  };
}

export function settingsPasswordFieldMessage(
  fieldId: MentrixaSettingsPasswordFieldId,
): MentrixaFormMessage {
  switch (fieldId) {
    case "current_password":
      return {
        verdict: "Current password confirms it is really you.",
        nextAction: "Reset via forgot password if you lost access.",
      };
    case "new_password":
      return {
        verdict: "Strong passwords protect your locked first answers.",
        nextAction: "Use at least 8 characters with one uppercase and one number.",
      };
    case "confirm_password":
      return {
        verdict: "Confirmation catches typos before they lock you out.",
        nextAction: "Match the new password exactly.",
      };
  }
}

export function contactFormFieldsetMessage(): MentrixaFormMessage {
  return {
    verdict: "Every note routes to the team that can act on it.",
    nextAction: "Pick a category so we reply from the right owner.",
  };
}

export function contactFormFieldMessage(fieldId: MentrixaContactFieldId): MentrixaFormMessage {
  switch (fieldId) {
    case "name":
      return {
        verdict: "A real name helps us follow up when it matters.",
        nextAction: "Use the name on your Mentrixa account if you have one.",
      };
    case "email":
      return {
        verdict: "Reply email must be one you check this week.",
        nextAction: "Use the same address as your Stripe receipt for billing.",
      };
    case "message":
      return {
        verdict: "Specific feedback ships faster than vague praise.",
        nextAction: "Name the screen, what you expected, and what happened instead.",
      };
  }
}

export function adminSecurityFieldsetMessage(): MentrixaFormMessage {
  return {
    verdict: "Admin 2FA is required before platform keys can move.",
    nextAction: "Scan the QR code, then verify with a 6-digit code.",
  };
}

export function adminFieldMessage(fieldId: MentrixaAdminFieldId): MentrixaFormMessage {
  switch (fieldId) {
    case "mfa_code":
      return {
        verdict: "Authenticator codes rotate every 30 seconds.",
        nextAction: "Enter the current 6 digits from your app.",
      };
  }
}

export function validateEmailAddress(value: string): string | null {
  if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value.trim())) {
    return "Please enter a valid email address";
  }
  return null;
}

export function validateNewPassword(value: string): string | null {
  if (value.length < 8) {
    return "Password must be at least 8 characters";
  }
  if (!/[A-Z]/.test(value)) {
    return "Password must contain at least one uppercase letter";
  }
  if (!/[0-9]/.test(value)) {
    return "Password must contain at least one number";
  }
  return null;
}

export function validateMfaCode(value: string): string | null {
  if (!/^\d{6}$/.test(value.trim())) {
    return "Enter a valid 6-digit authenticator code";
  }
  return null;
}

export function validateRequiredText(value: string, label: string): string | null {
  if (!value.trim()) {
    return `${label} is required`;
  }
  return null;
}
