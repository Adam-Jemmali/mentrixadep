import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

export function createClient() {
  return createBrowserClient(env.public.supabaseUrl, env.public.supabaseAnonKey);
}

