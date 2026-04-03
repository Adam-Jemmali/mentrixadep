/** Primary PNG mark — also at `/mentrixalogo.png` (duplicate). */
export const MENTRIXA_LOGO_PNG = "/mentrixalogo/logo.png";

/**
 * Default public feedback address for contact copy.
 * Override with `NEXT_PUBLIC_FEEDBACK_EMAIL`. For direct email to work, create this
 * mailbox (or alias) at your domain’s mail host — the app does not receive SMTP mail.
 */
export const DEFAULT_PUBLIC_FEEDBACK_EMAIL = "feedback@mentrixa.one";

/** Opens Gmail web compose so clicks don’t use the OS default client (e.g. Outlook on Windows). */
export function gmailWebComposeUrl(to: string): string {
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to.trim())}`;
}
