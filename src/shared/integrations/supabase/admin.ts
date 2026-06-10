import { createClient } from "@supabase/supabase-js";
import { env } from "@/shared/core/env";

export function createAdminClient() {
  if (!env.server.supabaseServiceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for admin operations");
  }

  return createClient(env.public.supabaseUrl, env.server.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

