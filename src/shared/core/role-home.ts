import type { UserRole } from "@/shared/types/database";

/** Default landing path after sign-in / auth redirects (navbar logo uses the same mapping). */
export function getRoleHomePath(role: UserRole | string | undefined | null): string {
  const r = typeof role === "string" ? role.trim().toLowerCase() : role;
  if (r === "admin") return "/admin";
  if (r === "tutor") return "/tutor";
  return "/student";
}
