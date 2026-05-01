import type { Metadata, Viewport } from "next";
import { OrganizationJsonLd } from "@/components/organization-json-ld";
import { DevServiceWorkerGuard } from "@/components/dev-service-worker-guard";
import { getSiteUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";
import { ConsoleSilencer } from "@/components/console-silencer";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#1E3A5F",
  width: "device-width",
  initialScale: 1,
};

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: `${SITE_NAME} — Live tutoring, quests & divisions`,
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  manifest: "/manifest.json",
  /** PNG / PWA icons — regenerate with `npm run pwa:icons` from `mentrixa-checkout-icon.svg`. */
  icons: {
    icon: [
      { url: "/favicon-mentrixa.ico?v=20260417", type: "image/x-icon" },
      { url: "/icon.png", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
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
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: SITE_NAME,
    url: siteUrl,
    title: `${SITE_NAME} — Live tutoring, quests & divisions`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/images/Mentrixa.png",
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — live tutoring and learning platform`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Live tutoring, quests & divisions`,
    description: SITE_DESCRIPTION,
    images: ["/images/Mentrixa.png"],
  },
};

/** Html/body only — no client app shell here (see `app/(app)/layout.tsx` and `app/(marketing)/layout.tsx`). */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="google-site-verification" content="7qMsPjvmHXjq4yWwD5z0HMpqJuyTBlhpDONtfRfh9dk" />
        {/* Favicons: versioned ICO first to bust stale crawler caches, PNGs for modern clients. */}
        <link rel="icon" href="/favicon-mentrixa.ico?v=20260417" type="image/x-icon" sizes="any" />
        <link rel="icon" href="/icons/icon-192.png" type="image/png" sizes="192x192" />
        <link rel="icon" href="/icon.png" type="image/png" />
        <link rel="shortcut icon" href="/favicon-mentrixa.ico?v=20260417" type="image/x-icon" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener("unhandledrejection", function(event) {
                if (event.reason && typeof event.reason.message === "string" && event.reason.message.includes("tabs:outgoing.message.ready")) {
                  event.preventDefault();
                }
              });
            `
          }}
        />
      </head>
      <body className="antialiased font-sans overflow-x-hidden relative" suppressHydrationWarning>
        <ConsoleSilencer />
        <OrganizationJsonLd />
        <DevServiceWorkerGuard />
        {children}
      </body>
    </html>
  );
}
