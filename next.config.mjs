import { withSentryConfig } from "@sentry/nextjs";
import bundleAnalyzer from "@next/bundle-analyzer";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

function supabaseStorageRemotePattern() {
  try {
    const u = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!u) return null;
    return {
      protocol: "https",
      hostname: new URL(u).hostname,
      pathname: "/storage/v1/object/public/**",
    };
  } catch {
    return null;
  }
}

const supabasePattern = supabaseStorageRemotePattern();

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@google/genai"],
  typescript: {
    tsconfigPath: "tsconfig.build.json",
    // Vercel Hobby OOMs/hangs on "Running TypeScript". CI runs `npx tsc` + build without VERCEL=1.
    ignoreBuildErrors: process.env.VERCEL === "1",
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@tabler/icons-react",
      "framer-motion",
      "recharts",
      "katex",
      "gsap",
      "@number-flow/react",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-popover",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
      "@supabase/supabase-js",
      "d3",
    ],
  },
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async redirects() {
    return [
      { source: "/quest", destination: "/student/quest", permanent: false },
    ];
  },

  async headers() {
    return [
      {
        // Force browsers and Vercel CDN to always re-fetch favicon files
        source: "/:file(favicon\\.ico|favicon-mentrixa\\.ico|apple-icon\\.png|icon\\.png|manifest\\.json)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
      {
        source: "/icons/:file*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/images/:file*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/geo/:file*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  poweredByHeader: false,

  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [65, 70, 75],
    minimumCacheTTL: 31536000,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "quickchart.io",
        pathname: "/**",
      },
      ...(supabasePattern ? [supabasePattern] : []),
    ],
  },

  compress: true,

  turbopack: {
    root: projectRoot,
  },

  onDemandEntries: {
    maxInactiveAge: 5 * 60 * 1000,
    pagesBufferLength: 20,
  },

  reactStrictMode: true,

  webpack: (config, { dev, isServer }) => {
    config.ignoreWarnings = [
      ...(Array.isArray(config.ignoreWarnings) ? config.ignoreWarnings : []),
      /Serializing big strings.*impacts deserialization performance/,
    ];
    if (dev) {
      config.infrastructureLogging = {
        ...config.infrastructureLogging,
        level: "error",
      };
      /** Next.js forces dev `devtool` in development; do not override (see improper-devtool warning). */
    }
    if (!dev && !isServer) {
      config.optimization = config.optimization ?? {};
      config.optimization.splitChunks = config.optimization.splitChunks ?? {};
      const cacheGroups = config.optimization.splitChunks.cacheGroups ?? {};
      config.optimization.splitChunks.cacheGroups = {
        ...cacheGroups,
        gsap: {
          test: /[\\/]node_modules[\\/]gsap[\\/]/,
          name: "gsap",
          chunks: "async",
          priority: 45,
          reuseExistingChunk: true,
        },
        framerMotion: {
          test: /[\\/]node_modules[\\/](framer-motion|motion-dom)[\\/]/,
          name: "framer-motion",
          chunks: "async",
          priority: 40,
          reuseExistingChunk: true,
        },
      };
    }
    return config;
  },
};

const finalConfig = withBundleAnalyzer(nextConfig);

export default withSentryConfig(finalConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
    automaticVercelMonitors: true,
  },
});
