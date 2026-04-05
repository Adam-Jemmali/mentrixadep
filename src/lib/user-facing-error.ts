export function toUserFacingAuthError(input: unknown): string {
  const message =
    input instanceof Error
      ? input.message
      : typeof input === "string"
        ? input
        : input && typeof input === "object" && "message" in input
          ? String((input as { message: unknown }).message ?? "")
          : "";

  const normalized = message.toLowerCase();

  if (!normalized) {
    return "Something went wrong. Please try again.";
  }

  if (normalized.includes("invalid login credentials") || normalized.includes("invalid email or password")) {
    return "Incorrect email or password. Please try again.";
  }

  if (normalized.includes("email rate limit") || normalized.includes("too many requests")) {
    return "Too many attempts right now. Please wait a moment and try again.";
  }

  if (normalized.includes("already registered") || normalized.includes("user already registered")) {
    return "An account with this email already exists. Try signing in instead.";
  }

  if (normalized.includes("password") && normalized.includes("weak")) {
    return "Choose a stronger password and try again.";
  }

  if (normalized.includes("network") || normalized.includes("fetch")) {
    return "Network issue detected. Check your connection and try again.";
  }

  return "Something went wrong. Please try again.";
}
