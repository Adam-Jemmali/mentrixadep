import { getSiteUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

/**
 * Organization + WebSite JSON-LD for brand clarity in Google (Knowledge Graph signals).
 */
export function OrganizationJsonLd() {
  const siteUrl = getSiteUrl();
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: SITE_NAME,
        url: siteUrl,
        description: SITE_DESCRIPTION,
        logo: {
          "@type": "ImageObject",
          url: `${siteUrl}/mentrixalogo/logo.png`,
        },
        sameAs: [
          process.env.NEXT_PUBLIC_SOCIAL_DISCORD_URL,
          process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM_URL,
          process.env.NEXT_PUBLIC_SOCIAL_TWITTER_URL,
          process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN_URL,
        ].filter(Boolean) as string[],
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        name: SITE_NAME,
        url: siteUrl,
        description: SITE_DESCRIPTION,
        inLanguage: "en-US",
        publisher: { "@id": `${siteUrl}/#organization` },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
