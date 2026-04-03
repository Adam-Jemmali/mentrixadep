import { RootLayoutClient } from "@/components/root-layout-client";
import { getCurrentUser } from "@/lib/auth";

/**
 * Authenticated app shell (nav, Supabase client, PWA hooks). Lives in its own route group so
 * the landing page route tree never imports this module.
 */
export default async function AppShellLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  return <RootLayoutClient user={user}>{children}</RootLayoutClient>;
}
