const DEFAULT_DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
  "yopmail.com",
  "trashmail.com",
  "sharklasers.com",
  "getnada.com",
  "maildrop.cc",
  "dispostable.com",
  "fakeinbox.com",
  "temp-mail.org",
  "tempmailo.com",
  "mailnesia.com",
  "mintemail.com",
  "throwawaymail.com",
  "emailondeck.com",
]);

function parseExtraBlockedDomains(raw: string | undefined): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean),
  );
}

function getDomain(email: string): string {
  const at = email.lastIndexOf("@");
  return at >= 0 ? email.slice(at + 1).toLowerCase() : "";
}

export function isDisposableEmail(email: string): boolean {
  const domain = getDomain(email);
  if (!domain) return false;

  const extra = parseExtraBlockedDomains(process.env.BLOCKED_EMAIL_DOMAINS);
  return DEFAULT_DISPOSABLE_DOMAINS.has(domain) || extra.has(domain);
}

