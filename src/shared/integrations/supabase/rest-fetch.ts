/** Minimal Supabase PostgREST fetch for OG routes — no @supabase/supabase-js bundle. */

function restHeaders(): HeadersInit | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: "application/json",
  };
}

export async function supabaseRestSelect<T>(table: string, query: string): Promise<T[]> {
  const headers = restHeaders();
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!headers || !base) return [];

  const res = await fetch(`${base}/rest/v1/${table}?${query}`, {
    headers,
    cache: "no-store",
  });
  if (!res.ok) return [];
  return (await res.json()) as T[];
}
