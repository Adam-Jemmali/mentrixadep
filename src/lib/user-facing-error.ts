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

export function toUserFacingAiError(input: unknown): string {
  const message =
    input instanceof Error
      ? input.message
      : typeof input === "string"
        ? input
        : input && typeof input === "object" && "message" in input
          ? String((input as { message: unknown }).message ?? "")
          : "";

  const normalized = message.toLowerCase();
  if (!normalized) return "Quest is temporarily unavailable. Please try again soon.";
  if (normalized.includes("rate limit") || normalized.includes("too many requests")) {
    return "Too many requests right now. Please wait a moment and try again.";
  }
  if (normalized.includes("timed out") || normalized.includes("timeout")) {
    return "This took too long to process. Please try again.";
  }
  if (normalized.includes("temporarily unavailable") || normalized.includes("service unavailable")) {
    return "Quest is temporarily unavailable. Please try again soon.";
  }
  if (normalized.includes("parse") || normalized.includes("invalid json")) {
    return "The response could not be processed. Please retry.";
  }
  return "Something went wrong while generating your result. Please try again.";
}

export function toUserFacingApiError(input: unknown): string {
  const message =
    input instanceof Error
      ? input.message
      : typeof input === "string"
        ? input
        : input && typeof input === "object" && "message" in input
          ? String((input as { message: unknown }).message ?? "")
          : "";
  const normalized = message.toLowerCase();
  if (!normalized) return "Request failed. Please try again.";
  if (normalized.includes("unauthorized") || normalized.includes("forbidden")) {
    return "You are not allowed to perform this action.";
  }
  if (normalized.includes("invalid")) return "Invalid request. Please check your input and try again.";
  if (normalized.includes("rate limit") || normalized.includes("too many")) {
    return "Too many requests. Please wait and try again.";
  }
  return "Request failed. Please try again.";
}
