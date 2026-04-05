import type { MetadataRoute } from "next";

const SITE_URL = "https://mentrixa.one";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin/", "/dashboard/", "/settings/", "/student/", "/teacher/", "/tutor/"] ,
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
