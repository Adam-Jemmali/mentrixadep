/**
 * Dedicated shell for `/contact` with a consistent dark surface.
 */
export default function ContactMarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0b1222] via-[#0f1a32] to-[#111f3f] text-white py-8 px-4 sm:px-6">
      {children}
    </div>
  );
}
