/**
 * Light shell so the contact form (slate UI) stays readable inside the dark marketing `main`.
 */
export default function ContactMarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-[calc(100vh-2rem)] bg-slate-50 text-slate-900 py-10 px-4 sm:px-6">{children}</div>
  );
}
