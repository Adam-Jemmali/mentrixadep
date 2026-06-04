import { MarketingShellClient } from "@/components/marketing-shell-client";
import { MENTRIXA_LOGO_PNG } from "@/lib/mentrixa-brand";

/**
 * Public marketing shell only — no `RootLayoutClient` / Supabase Realtime in this layout chunk.
 * Keeps `/` dev bundle separate from the authenticated app shell.
 */
export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <link rel="preload" href={MENTRIXA_LOGO_PNG} as="image" type="image/webp" />
      <MarketingShellClient>{children}</MarketingShellClient>
    </>
  );
}
