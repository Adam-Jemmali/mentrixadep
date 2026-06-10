export type AccessStatus = "pending" | "approved" | "suspended";

export type AccessStatusInput = {
  status?: string | null;
  approved?: boolean | null;
  is_blacklisted?: boolean | null;
};

export function normalizeAccessStatus(input: AccessStatusInput | null | undefined): AccessStatus {
  const explicit = (input?.status ?? "").trim().toLowerCase();
  if (explicit === "approved") return "approved";
  if (explicit === "suspended") return "suspended";
  if (explicit === "pending") return "pending";

  if (input?.is_blacklisted === true) return "suspended";
  if (input?.approved === true) return "approved";
  return "pending";
}
