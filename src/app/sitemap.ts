import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

/** Public URLs that should be discoverable (no auth wall). `/tutor` is the Guide dashboard — not listed. */
const publicPaths = [
  "/",
  "/contact",
  "/auth/signin",
  "/auth/signup",
  "/auth/select-role",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/terms",
  "/privacy",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const lastModified = new Date();

  return publicPaths.map((path) => ({
    url: `${siteUrl}${path === "/" ? "" : path}`,
    lastModified,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
