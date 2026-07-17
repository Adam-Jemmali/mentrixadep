/**
 * Detect GitHub Actions / Playwright synthetic accounts that must never
 * appear on public Arena, leaderboards, or as real Mentrixers.
 */

const E2E_EXAMPLE_EMAIL =
  /^e2e([.+_-]|$)/i;

const E2E_LABEL =
  /(?:^|[^a-z0-9])e2e(?:[-_.]|$)|e2e[-_.]?chain|e2e[-_.]?guest/i;

export function isE2ESyntheticEmail(email: string | null | undefined): boolean {
  const value = (email ?? "").trim().toLowerCase();
  if (!value) return false;
  if (!value.endsWith("@example.com")) return false;
  return E2E_EXAMPLE_EMAIL.test(value) || value.includes("e2e.guest") || value.includes("e2e.chain");
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
