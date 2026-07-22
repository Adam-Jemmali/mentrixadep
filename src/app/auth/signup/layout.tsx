import type { Metadata } from "next";
import { getSiteUrl } from "@/shared/core/site";

export const metadata: Metadata = {
  title: "Sign up. Mentrixa",
  description:
    "Create a Mentrixa account as a Mentrixer or Guide — structured learning, live tutoring, and skill progress.",
  alternates: { canonical: `${getSiteUrl()}/auth/signup` },
  robots: { index: true, follow: true },
};

export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
