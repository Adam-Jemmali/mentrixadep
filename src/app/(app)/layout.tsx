import { RootLayoutClient } from "@/components/root-layout-client";
import { getCurrentUser } from "@/shared/core/auth";

/**
 * Authenticated app shell (nav, Supabase client, PWA hooks). Lives in its own route group so
 * the landing page route tree never imports this module.
 */
export const dynamic = "force-dynamic";

export default async function AppShellLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  let user: Awaited<ReturnType<typeof getCurrentUser>> = null;
  try {
    user = await getCurrentUser();
  } catch (e) {
    console.error("[AppShellLayout] getCurrentUser failed:", e);
  }
  return <RootLayoutClient user={user}>{children}</RootLayoutClient>;
}
