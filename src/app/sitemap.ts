import type { MetadataRoute } from "next";

const SITE_URL = "https://mentrixa.one";

const publicPaths = [
  "/",
  "/contact",
  "/signin",
  "/signup",
  "/select-role",
  "/forgot-password",
  "/reset-password",
  "/terms",
  "/join",
  "/tutor",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return publicPaths.map((path) => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
    lastModified,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
