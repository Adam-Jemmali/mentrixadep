/**
 * Canonical identity key for email matching.
 * Gmail / Googlemail ignore dots in the local part — `team.innovatecast@gmail.com` and
 * `teaminnovatecast@gmail.com` are the same inbox but different strings in the DB.
 */
export function identityEmailKey(email: string): string {
  const e = email.trim().toLowerCase();
  const at = e.lastIndexOf("@");
  if (at <= 0) return e;
  let local = e.slice(0, at);
  const domain = e.slice(at + 1);
  if (domain === "gmail.com" || domain === "googlemail.com") {
    local = local.replace(/\./g, "");
  }
  return `${local}@${domain}`;
}
