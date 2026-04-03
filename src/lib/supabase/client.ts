import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client — must NOT import `@/lib/env` (that module is server-oriented and
 * runs `validateEnvAtStartup` + bundles getters that confuse the client webpack graph in dev).
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url?.trim() || !key?.trim()) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return createBrowserClient(url, key);
}

