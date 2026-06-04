import type { ReactNode } from "react";
import { GoogleGsiScript } from "@/components/auth/google-gsi-script";
import AuthLayoutShell from "./auth-layout-shell";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <GoogleGsiScript />
      <AuthLayoutShell>{children}</AuthLayoutShell>
    </>
  );
}
