export const AP_CALC_AB_SUBJECT = "AP Calculus AB";

export const AP_CALC_AB_UNAVAILABLE_MESSAGE =
  "AP Calculus AB practice is being prepared for this topic. Check back shortly.";

export const GUEST_NON_AP_CALC_SUBJECT_MESSAGE =
  "AP Calculus AB is the first subject available for verified practice. More subjects are being built. Try AP Calculus AB now.";

export function isApCalculusAbSubject(subject: string): boolean {
  const normalized = subject
    .trim()
    .toLowerCase()
    .replace(/\s+division$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  return normalized === "ap calculus ab";
}

export function normalizeNodeKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
