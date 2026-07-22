export type PassportSex = "feminine" | "masculine";

export function formatPassportSexLabel(sex: PassportSex | null | undefined): string {
  if (sex === "feminine") return "Feminine";
  if (sex === "masculine") return "Masculine";
  return "Not set";
}

export function formatPassportMemberSince(iso: string): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatPassportTimezone(timezone: string): string {
  const trimmed = timezone.trim();
  if (!trimmed) return "UTC";
  return trimmed.replace(/_/g, " ");
}

export function resolvePassportSignature(signature: string | null | undefined, displayName: string): string {
  const custom = signature?.trim();
  if (custom) return custom;
  return displayName.trim() || "Mentrixer";
}

export function formatPassportRoleLabel(role: "student" | "tutor"): string {
  return role === "tutor" ? "Guide" : "Mentrixer";
}

export function formatPassportBio(bio: string | null | undefined): string {
  const trimmed = bio?.trim();
  if (!trimmed) return "No bio yet";
  return trimmed.length > 140 ? `${trimmed.slice(0, 137)}…` : trimmed;
}

/** Machine readable zone lines for passport footer (ICAO-style filler). */
export function formatPassportMrzLines(
  username: string,
  subject: string,
  displayName: string,
): [string, string] {
  const slug = username.toUpperCase().replace(/[^A-Z0-9]/g, "<").padEnd(9, "<").slice(0, 9);
  const name = displayName.toUpperCase().replace(/[^A-Z ]/g, "").trim().replace(/\s+/g, "<");
  const sub = subject.toUpperCase().replace(/[^A-Z0-9]/g, "<").slice(0, 8);
  const line1 = `P<MTRX${slug}<<${name}`.padEnd(44, "<").slice(0, 44);
  const line2 = `${sub}<<<<MENTRIXA<<VERIFIED<<<<`.padEnd(44, "<").slice(0, 44);
  return [line1, line2];
}

/** @deprecated Use formatPassportMrzLines */
export function formatPassportMrz(username: string, subject: string): string {
  const [line1] = formatPassportMrzLines(username, subject, username);
  return line1;
}
