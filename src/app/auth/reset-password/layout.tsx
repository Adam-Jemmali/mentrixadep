import type { Metadata } from "next";
import { getSiteUrl } from "@/shared/core/site";

export const metadata: Metadata = {
  title: "Reset password. Mentrixa",
  description: "Set a new password for your Mentrixa account.",
  alternates: { canonical: `${getSiteUrl()}/auth/reset-password` },
  robots: { index: false, follow: true },
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
