import { MarketingShellClient } from "@/components/marketing-shell-client";

/**
 * Public marketing shell only — no `RootLayoutClient` / Supabase Realtime in this layout chunk.
 * Keeps `/` dev bundle separate from the authenticated app shell.
 */
export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <MarketingShellClient>{children}</MarketingShellClient>;
}
