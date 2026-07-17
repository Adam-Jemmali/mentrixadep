"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/shared/ui/button";
import type { BeforeAfterShareArtifact } from "@/features/share-artifacts/load-share-artifact";
import { formatShareAccuracy } from "@/features/share-artifacts/before-after-pure";

export function BeforeAfterSharePage({ data }: { data: BeforeAfterShareArtifact }) {
  const [copied, setCopied] = useState(false);
  const before = formatShareAccuracy(data.beforeValue);
  const after = formatShareAccuracy(data.afterValue);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(data.shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [data.shareUrl]);

  const tweet = `I moved ${data.nodeName} from ${before} to ${after} on Mentrixa. ${data.shareUrl}`;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-8 sm:px-6">
      <div className="mb-8 flex items-center justify-between rounded-2xl border border-white/15 bg-white/5 px-4 py-3">
        <span className="text-sm font-semibold text-slate-100">Mentrixa</span>
        <Link href="/" className="text-sm font-medium text-violet-300 hover:text-white">
          Home
        </Link>
      </div>

      <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#0F172A]">
        <Image
          src={data.imageUrl ?? data.ogImageUrl}
          alt={`${data.nodeName}: ${before} to ${after}`}
          width={1200}
          height={630}
          unoptimized
          className="h-auto w-full"
          priority
        />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button
          type="button"
          onClick={() => void copyLink()}
          className="rounded-xl bg-[#7C3AED] text-white hover:bg-[#6D28D9]"
        >
          {copied ? "Link copied" : "Copy link"}
        </Button>
        <Button
          type="button"
          variant="outline"
          asChild
          className="rounded-xl border-violet-400/40 bg-transparent text-violet-100"
        >
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Share on X
          </a>
        </Button>
      </div>

      <div className="mt-10 rounded-2xl border border-violet-400/30 bg-violet-950/40 px-5 py-5 text-center">
        <p className="text-sm text-slate-300">See your own before and after.</p>
        <Link
          href="/auth/signin"
          className="mt-3 inline-flex text-sm font-semibold text-violet-300 underline-offset-2 hover:underline"
        >
          Start on Mentrixa
        </Link>
      </div>
    </div>
  );
}
