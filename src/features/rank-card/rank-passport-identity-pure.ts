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

/** Machine readable zone line for passport footer. */
export function formatPassportMrz(username: string, subject: string): string {
  const slug = username.toUpperCase().replace(/[^A-Z0-9]/g, "<");
  const sub = subject.toUpperCase().replace(/[^A-Z0-9]/g, "<").slice(0, 12);
  return `P<MTRX${slug}<<<<${sub}<<<<<<<<<<<<<<`;
}
