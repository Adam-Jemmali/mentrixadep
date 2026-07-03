import type { Metadata, Viewport } from "next";
import { OrganizationJsonLd } from "@/components/organization-json-ld";
import { DevServiceWorkerGuard } from "@/components/dev-service-worker-guard";
import { getSiteUrl, SITE_DESCRIPTION, SITE_NAME } from "@/shared/core/site";
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
        url: "/images/Mentrixa.webp",
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
    images: ["/images/Mentrixa.webp"],
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
        {/* Favicons: versioned ICO first to bust stale crawler caches, SVG for modern clients. */}
        <link rel="icon" href="/favicon-mentrixa.ico?v=20260417" type="image/x-icon" sizes="any" />
        <link rel="icon" href="/mentrixa-checkout-icon.svg" type="image/svg+xml" />
        <link rel="shortcut icon" href="/favicon-mentrixa.ico?v=20260417" type="image/x-icon" />
        <link rel="manifest" href="/manifest.json" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              function isExtensionNoListenerNoise(value) {
                var text = String(value || "");
                return text.includes("tabs:outgoing.message.ready") || (text.includes("No Listener") && text.includes("tabs:outgoing.message.ready"));
              }
              function stringifyReasonChain(reason, depth) {
                if (depth === undefined) depth = 0;
                if (depth > 6) return "";
                if (reason == null) return "";
                if (typeof reason === "string") return reason;
                if (reason instanceof Error) {
                  var base = String(reason.message || "") + "\\n" + String(reason.stack || "");
                  var c = reason.cause;
                  return c != null ? base + "\\n" + stringifyReasonChain(c, depth + 1) : base;
                }
                if (typeof reason === "object") {
                  try {
                    var msg = reason.message != null ? String(reason.message) : "";
                    var stack = reason.stack != null ? String(reason.stack) : "";
                    var cause = reason.cause;
                    return msg + "\\n" + stack + "\\n" + (cause != null ? stringifyReasonChain(cause, depth + 1) : "");
                  } catch (e) {
                    return String(reason);
                  }
                }
                return String(reason);
              }
              function isExtensionRuntimeNoise(reason) {
                var text = stringifyReasonChain(reason);
                return text.includes("chrome-extension://") || text.includes("moz-extension://") || text.includes("safari-web-extension://");
              }
              function shouldSuppressRejection(reason) {
                return isExtensionNoListenerNoise(reason) || isExtensionRuntimeNoise(reason) || isExtensionNoListenerNoise(stringifyReasonChain(reason));
              }
              window.addEventListener("unhandledrejection", function(event) {
                var reason = event.reason;
                var message = reason && typeof reason === "object" ? reason.message : "";
                var cause = reason && typeof reason === "object" ? reason.cause : "";
                if (
                  shouldSuppressRejection(reason) ||
                  isExtensionNoListenerNoise(message) ||
                  isExtensionNoListenerNoise(cause) ||
                  isExtensionRuntimeNoise(message) ||
                  isExtensionRuntimeNoise(cause)
                ) {
                  event.preventDefault();
                }
              });
              window.addEventListener("error", function(event) {
                var fromExtensionFile =
                  typeof event.filename === "string" &&
                  (event.filename.includes("chrome-extension://") ||
                    event.filename.includes("moz-extension://") ||
                    event.filename.includes("safari-web-extension://") ||
                    (event.filename.includes("vendor.js") && isExtensionNoListenerNoise(event.message)));
                if (
                  fromExtensionFile ||
                  isExtensionNoListenerNoise(event.message) ||
                  isExtensionNoListenerNoise(event.error) ||
                  isExtensionRuntimeNoise(event.error) ||
                  isExtensionRuntimeNoise(event.message)
                ) {
                  event.preventDefault();
                }
              });
              function isChunkLoadNoise(value) {
                var text = String(value || "");
                return text.includes("ChunkLoadError") || text.includes("Loading chunk") && text.includes("failed");
              }
              function reloadOnceOnStaleChunk() {
                try {
                  var key = "mentrixa-chunk-reload";
                  var last = sessionStorage.getItem(key);
                  var now = Date.now();
                  if (last && now - Number(last) < 10000) return;
                  sessionStorage.setItem(key, String(now));
                  window.location.reload();
                } catch (e) {}
              }
              window.addEventListener("unhandledrejection", function(event) {
                if (isChunkLoadNoise(event.reason) || isChunkLoadNoise(event.reason && event.reason.message)) {
                  event.preventDefault();
                  reloadOnceOnStaleChunk();
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
