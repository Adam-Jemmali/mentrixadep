/**
 * OAuth signup/signin cookie bridge + university email hints for auth UI.
 */

export const OAUTH_INTENT_COOKIE = "mentrixa_oauth_intent";
export const OAUTH_ROLE_COOKIE = "mentrixa_oauth_role";
/** Short-lived cookies for the OAuth redirect round-trip */
export const OAUTH_COOKIE_MAX_AGE = 600;

export type OAuthIntent = "signup" | "signin";
export type OAuthSignupRole = "student" | "tutor";

export function setOAuthCookiesClient(opts: {
  intent: OAuthIntent;
  /** Required when intent is signup (selected before Google). */
  signupRole?: OAuthSignupRole;
}): void {
  if (typeof document === "undefined") return;
  const secure = typeof window !== "undefined" && window.location.protocol === "https:";
  const base = `Path=/; Max-Age=${OAUTH_COOKIE_MAX_AGE}; SameSite=Lax${secure ? "; Secure" : ""}`;
  document.cookie = `${OAUTH_INTENT_COOKIE}=${opts.intent}; ${base}`;
  if (opts.intent === "signup" && opts.signupRole) {
    document.cookie = `${OAUTH_ROLE_COOKIE}=${opts.signupRole}; ${base}`;
  } else {
    document.cookie = `${OAUTH_ROLE_COOKIE}=; ${base}; Max-Age=0`;
  }
}

export function clearOAuthCookiesClient(): void {
  if (typeof document === "undefined") return;
  const secure = typeof window !== "undefined" && window.location.protocol === "https:";
  const base = `Path=/; Max-Age=0; SameSite=Lax${secure ? "; Secure" : ""}`;
  document.cookie = `${OAUTH_INTENT_COOKIE}=; ${base}`;
  document.cookie = `${OAUTH_ROLE_COOKIE}=; ${base}`;
}

/** University / academic TLD patterns (real-time signup hint only; personal email still allowed). */
export function isUniversityEmailDomain(email: string): boolean {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at < 0) return false;
  const host = trimmed.slice(at + 1);
  if (!host) return false;
  return (
    host.endsWith(".edu") ||
    host.endsWith(".ac.uk") ||
    host.endsWith(".ca")
  );
}

export function universityEmailHint(email: string): "university" | "personal" | "empty" {
  const t = email.trim();
  if (!t || !t.includes("@")) return "empty";
  return isUniversityEmailDomain(t) ? "university" : "personal";
}
