/**
 * Detect GitHub Actions / Playwright synthetic accounts that must never
 * appear on public Arena, browse Guides, rank pages, or leaderboards.
 */

const E2E_LABEL =
  /(?:^|[^a-z0-9])e2e(?:[-_.]|$)|e2e[-_.]?chain|e2e[-_.]?guest/i;

export function isE2ESyntheticEmail(email: string | null | undefined): boolean {
  const value = (email ?? "").trim().toLowerCase();
  if (!value) return false;
  if (!value.endsWith("@example.com")) return false;
  const local = value.slice(0, -"@example.com".length);
  if (local.startsWith("e2e")) return true;
  if (local.includes("e2e.guest") || local.includes("e2e.chain")) return true;
  if (local.endsWith(".e2e") || local.includes(".e2e.")) return true;
  return false;
}

export function isE2ESyntheticLabel(label: string | null | undefined): boolean {
  const value = (label ?? "").trim().toLowerCase();
  if (!value) return false;
  return E2E_LABEL.test(value);
}

export function isE2ESyntheticAccount(input: {
  email?: string | null;
  displayName?: string | null;
  username?: string | null;
}): boolean {
  if (isE2ESyntheticEmail(input.email)) return true;
  if (isE2ESyntheticLabel(input.displayName)) return true;
  if (isE2ESyntheticLabel(input.username)) return true;
  return false;
}

/** Block guest-chain / booking e2e against production Mentrixa hosts. */
export function isProductionMentrixaHost(urlOrHost: string | null | undefined): boolean {
  const raw = (urlOrHost ?? "").trim().toLowerCase();
  if (!raw) return false;
  let host = raw;
  try {
    host = raw.includes("://") ? new URL(raw).hostname : raw;
  } catch {
    return /mentrixa\.one/i.test(raw);
  }
  return host === "mentrixa.one" || host.endsWith(".mentrixa.one");
}
