import type { ReactNode } from "react";
import { GoogleGsiScript } from "@/features/auth/ui/google-gsi-script";
import AuthLayoutShell from "./auth-layout-shell";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <GoogleGsiScript />
      <AuthLayoutShell>{children}</AuthLayoutShell>
    </>
  );
}
