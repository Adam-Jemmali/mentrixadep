/**
 * Next.js `redirect()` from a Server Action throws an error with a `NEXT_REDIRECT` digest.
 * Client catch blocks must rethrow it so navigation runs instead of treating it as a failure.
 */
export function isNextRedirectError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("digest" in error)) return false;
  const digest = (error as { digest?: unknown }).digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}
