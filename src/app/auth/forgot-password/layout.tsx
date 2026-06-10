import type { Metadata } from "next";
import { getSiteUrl } from "@/shared/core/site";

export const metadata: Metadata = {
  title: "Forgot password · Mentrixa",
  description: "Reset your Mentrixa account password securely.",
  alternates: { canonical: `${getSiteUrl()}/auth/forgot-password` },
  robots: { index: false, follow: true },
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
