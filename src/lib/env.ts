/**
 * Environment variables with type safety
 * Access environment variables through this module for type safety
 */

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getOptionalEnvVar(key: string, defaultValue?: string): string | undefined {
  return process.env[key] ?? defaultValue;
}

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL");
  }
  return url;
}

function getSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return key;
}

export const env = {
  // Public environment variables (exposed to the browser)
  public: {
    appUrl: getOptionalEnvVar("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
    get supabaseUrl() {
      return getSupabaseUrl();
    },
    get supabaseAnonKey() {
      return getSupabaseAnonKey();
    },
  },
  // Server-only environment variables
  server: {
    supabaseServiceRoleKey: getOptionalEnvVar("SUPABASE_SERVICE_ROLE_KEY"),
  },
  // WebRTC configuration (optional - uses public STUN servers if not provided)
  webrtc: {
    stunServers: getOptionalEnvVar("NEXT_PUBLIC_STUN_SERVERS")?.split(",") || [
      "stun:stun.l.google.com:19302",
      "stun:stun1.l.google.com:19302",
    ],
    turnServers: getOptionalEnvVar("NEXT_PUBLIC_TURN_SERVERS")?.split(",") || [],
  },
} as const;

export { getEnvVar, getOptionalEnvVar };

