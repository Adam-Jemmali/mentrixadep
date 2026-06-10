import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/shared/core/site";

/**
 * Do not disallow `/tutor/` — public Guide profiles live at `/tutor/[id]` and should be crawlable.
 * App-only areas use `noindex` in layout where appropriate.
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin/", "/dashboard/", "/settings/", "/student/", "/teacher/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
