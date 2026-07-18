import Script from "next/script";
import { headers } from "next/headers";
import { GOOGLE_GSI_SCRIPT_SRC } from "@/shared/integrations/google-gsi-loader";

/** Preloads GSI on auth pages so the sign-in button does not race an empty container. */
export async function GoogleGsiScript() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
  if (!clientId) return null;

  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <Script
      id="google-gsi-client"
      src={GOOGLE_GSI_SCRIPT_SRC}
      strategy="afterInteractive"
      nonce={nonce}
    />
  );
}
