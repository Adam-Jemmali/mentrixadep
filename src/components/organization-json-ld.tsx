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
