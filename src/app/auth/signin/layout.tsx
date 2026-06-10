import type { Metadata } from "next";
import { getSiteUrl } from "@/shared/core/site";

export const metadata: Metadata = {
  title: "Sign in · Mentrixa",
  description:
    "Sign in to Mentrixa — live sessions, quests, divisions, and progress for students and Guides.",
  alternates: { canonical: `${getSiteUrl()}/auth/signin` },
  robots: { index: true, follow: true },
};

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return children;
}
