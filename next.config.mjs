import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Redirect /quest to /student/quest (correct path)
  async redirects() {
    return [
      { source: "/quest", destination: "/student/quest", permanent: false },
    ];
  },
  // Security: Disable X-Powered-By header
  poweredByHeader: false,

  // Performance: Optimize images - JPEG is default fallback, formats are for optimization
  images: {
    formats: ["image/avif", "image/webp"], // JPEG is default fallback
    minimumCacheTTL: 31536000, // 1 year cache
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },

  // Performance: Enable compression
  compress: true,

  // Performance: Optimize production builds
  swcMinify: true,

  // Performance: Experimental features for better scalability
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },

  // Security: Strict mode for better error detection
  reactStrictMode: true,
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  widenClientFileUpload: true,

  // Proxy to reduce ad-blocker interference with event delivery
  tunnelRoute: "/monitoring",

  silent: !!process.env.CI,
});
