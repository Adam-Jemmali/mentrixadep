import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadBeforeAfterShareByToken } from "@/features/share-artifacts/load-share-artifact";
import { BeforeAfterSharePage } from "@/features/share-artifacts/before-after-share-page";
import { formatShareAccuracy } from "@/features/share-artifacts/before-after-pure";

type Props = { params: Promise<{ share_token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { share_token } = await params;
  const artifact = await loadBeforeAfterShareByToken(share_token);
  if (!artifact) return { title: "Share · Mentrixa" };

  const before = formatShareAccuracy(artifact.beforeValue);
  const after = formatShareAccuracy(artifact.afterValue);

  return {
    title: `${artifact.nodeName}: ${before} to ${after} · Mentrixa`,
    description: `${artifact.nodeName} improved from ${before} to ${after} on Mentrixa.`,
    openGraph: {
      title: `${artifact.nodeName}: ${before} → ${after}`,
      description: artifact.guideName
        ? `with ${artifact.guideName}`
        : "Verified before and after on Mentrixa.",
      url: artifact.shareUrl,
      images: [
        {
          url: artifact.ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${artifact.nodeName} before and after`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${artifact.nodeName}: ${before} → ${after}`,
      images: [artifact.ogImageUrl],
    },
  };
}

export default async function ShareTokenPage({ params }: Props) {
  const { share_token } = await params;
  const artifact = await loadBeforeAfterShareByToken(share_token);
  if (!artifact) notFound();
  return (
    <main className="min-h-dvh bg-[#0B1220] text-slate-100">
      <BeforeAfterSharePage data={artifact} />
    </main>
  );
}
