import type { Metadata, Viewport } from "next";
import { DevServiceWorkerGuard } from "@/components/dev-service-worker-guard";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#1E3A5F",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Mentrixa",
  description:
    "Mentrixa helps students and tutors work smarter with structured quests, sessions, and divisions.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/icon.png",
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "Mentrixa",
    statusBarStyle: "default",
  },
  /** Standard name; keeps `apple-mobile-web-app-capable` from Next while satisfying the newer meta warning. */
  other: {
    "mobile-web-app-capable": "yes",
  },
  formatDetection: {
    telephone: false,
  },
};

/** Html/body only — no client app shell here (see `app/(app)/layout.tsx` and `app/(marketing)/layout.tsx`). */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        <DevServiceWorkerGuard />
        {children}
      </body>
    </html>
  );
}
