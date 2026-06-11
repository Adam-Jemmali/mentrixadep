const USERNAME_RE = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$|^[a-z0-9]{3}$/;

export function slugifyRankCardUsername(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

export function isValidRankCardUsername(username: string): boolean {
  return USERNAME_RE.test(username) && username.length >= 3 && username.length <= 30;
}

export function suggestRankCardUsername(displayName: string, suffix = ""): string {
  const base = slugifyRankCardUsername(displayName) || "mentrixer";
  const candidate = suffix ? `${base}-${suffix}` : base;
  return candidate.slice(0, 30);
}
