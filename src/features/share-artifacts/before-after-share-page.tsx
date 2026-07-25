"use client";

import Link from "next/link";
import { BeforeAfterCard } from "@/features/share/before-after-card";
import { MentrixaWordmark } from "@/components/mentrixa-wordmark";
import type { BeforeAfterShareArtifact } from "@/features/share-artifacts/load-share-artifact";

export function BeforeAfterSharePage({ data }: { data: BeforeAfterShareArtifact }) {
  return (
    <div className="mx-auto max-w-md px-4 pb-16 pt-[calc(3.5rem+1rem)] sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <MentrixaWordmark className="text-sm" />
        <Link
          href="/"
          className="cursor-pointer text-sm font-semibold text-[var(--mx-muted)] hover:text-white"
        >
          Back to home
        </Link>
      </div>

      <BeforeAfterCard
        mode="share"
        nodeName={data.nodeName}
        beforeAccuracy={data.beforeValue}
        afterAccuracy={data.afterValue}
        guideName={data.guideName ?? undefined}
        date={new Date(data.createdAt)}
        rankUsername={data.rankUsername}
        shareUrl={data.shareUrl}
      />

      <p className="mt-8 text-center text-sm text-[var(--mx-muted)]">
        See your own proof on{" "}
        <Link href="/try" className="font-semibold text-[var(--mx-violet)] hover:text-white">
          Mentrixa
        </Link>
      </p>
    </div>
  );
}
