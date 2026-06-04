import Script from "next/script";
import { GOOGLE_GSI_SCRIPT_SRC } from "@/lib/google-gsi-loader";

/** Preloads GSI on auth pages so the sign-in button does not race an empty container. */
export function GoogleGsiScript() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
  if (!clientId) return null;

  return (
    <Script
      id="google-gsi-client"
      src={GOOGLE_GSI_SCRIPT_SRC}
      strategy="afterInteractive"
    />
  );
}
