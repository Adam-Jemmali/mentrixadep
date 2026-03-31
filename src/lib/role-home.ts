import type { UserRole } from "@/lib/database.types";

/** Default landing path after sign-in / auth redirects (navbar logo uses the same mapping). */
export function getRoleHomePath(role: UserRole | string | undefined | null): string {
  if (role === "admin") return "/dashboard";
  if (role === "tutor") return "/tutor";
  return "/student";
}
