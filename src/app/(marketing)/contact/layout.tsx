import { landingHub } from "@/features/marketing/landing/landing-hub-ui";

/** Contact — hub desk paper surface (matches landing sticky notes). */
export default function ContactMarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className={landingHub.pageRoot}>{children}</div>;
}
