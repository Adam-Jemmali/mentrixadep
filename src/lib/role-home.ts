import type { UserRole } from "@/lib/database.types";

/** Default landing path after sign-in / auth redirects (navbar logo uses the same mapping). */
export function getRoleHomePath(role: UserRole | string | undefined | null): string {
  const r = typeof role === "string" ? role.trim().toLowerCase() : role;
  if (r === "admin") return "/dashboard";
  if (r === "tutor") return "/tutor";
  return "/student";
}
