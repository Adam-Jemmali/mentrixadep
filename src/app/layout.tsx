import type { Metadata } from "next";
import "./globals.css";
import { AppNavOrNothing } from "@/components/app-nav-or-nothing";
import { ErrorBoundary } from "@/components/error-boundary";
import { getCurrentUser } from "@/lib/auth";
import { PageFade } from "@/components/page-fade";

export const metadata: Metadata = {
  title: "Mentrixa — Learning, leveled up",
  description: "Mentrixa helps students and tutors work smarter with structured quests, sessions, and divisions.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body className="antialiased font-sans">
        <ErrorBoundary>
          <AppNavOrNothing user={user} />
          <main className="relative min-h-screen pt-14 bg-[#FAFAFA] bg-mesh-blue">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
              <PageFade>{children}</PageFade>
            </div>
          </main>
        </ErrorBoundary>
      </body>
    </html>
  );
}
