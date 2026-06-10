import type { Metadata } from "next";
import { getSiteUrl } from "@/shared/core/site";

export const metadata: Metadata = {
  title: "Choose your role · Mentrixa",
  description:
    "Select whether you are joining Mentrixa as a learner (Mentrixer) or a Guide — we personalize your experience.",
  alternates: { canonical: `${getSiteUrl()}/auth/select-role` },
  robots: { index: false, follow: true },
};

export default function SelectRoleLayout({ children }: { children: React.ReactNode }) {
  return children;
}
