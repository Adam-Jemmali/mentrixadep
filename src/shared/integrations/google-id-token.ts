/** Read email from a Google Identity Services ID token (JWT payload only; not signature verification). */
export function readEmailFromGoogleIdToken(credential: string): string | null {
  try {
    const parts = credential.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1]!.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as { email?: string };
    const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
    return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
  } catch {
    return null;
  }
}
