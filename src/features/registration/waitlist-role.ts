export type WaitlistRole = "student" | "tutor";

/** Maps URL / signup `role` query values to waitlist API role. */
export function waitlistRoleFromQuery(role: string | undefined | null): WaitlistRole {
  const t = (role ?? "").trim().toLowerCase();
  if (t === "tutor" || t === "guide") return "tutor";
  if (t === "student" || t === "mentrixer") return "student";
  return "student";
}
