"use client";

import { useRef } from "react";
import { useGsapScrollTriggerEffect } from "@/shared/core/gsap-lazy";
import { Typewriter } from "@/shared/ui/typewriter";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { GUIDE_PUBLIC_COPY } from "@/features/tutor/public-profile-pure";
import { GuideAnimatedSticky } from "@/features/tutor/ui/guide-animated-sticky";
import { cn } from "@/shared/core/utils";

function relativeDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function GuidePublicReviewsSection({
  avgRating,
  ratingCount,
  ratingDistribution,
  reviews,
}: {
  avgRating: number | null;
  ratingCount: number;
  ratingDistribution: { star: number; count: number }[];
  reviews: { rating: number; comment: string | null; created_at: string }[];
}) {
  const ratingBarRefs = useRef<HTMLDivElement[]>([]);
  const reviewRefs = useRef<HTMLDivElement[]>([]);

  useGsapScrollTriggerEffect((gsap, ScrollTrigger) => {
    const total = ratingCount;
    ratingBarRefs.current.forEach((bar, i) => {
      if (!bar) return;
      const dist = ratingDistribution[i];
      if (!dist) return;
      const ratio = total > 0 ? dist.count / total : 0;
      gsap.fromTo(
        bar,
        { scaleX: 0 },
        {
          scaleX: ratio,
          duration: 0.6,
          ease: "power2.out",
          delay: i * 0.06,
          transformOrigin: "left center",
          scrollTrigger: { trigger: bar, start: "top 85%", once: true },
        },
      );
    });
    return () => ScrollTrigger.getAll().forEach((t) => t.kill());
  }, [ratingDistribution, ratingCount]);

  useGsapScrollTriggerEffect((gsap) => {
    const els = reviewRefs.current.filter(Boolean);
    if (!els.length) return;
    gsap.fromTo(
      els,
      { opacity: 0, y: 8 },
      {
        opacity: 1,
        y: 0,
        stagger: 0.07,
        duration: 0.3,
        ease: "power2.out",
        scrollTrigger: { trigger: els[0], start: "top 88%", once: true },
      },
    );
  }, [reviews.length]);

  return (
    <section id="guide-reviews" className="scroll-mt-20">
      <GuideAnimatedSticky variant="strip" staggerIndex={5}>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-[#0B1220]">
          <MentrixaVocabIcon name="session" size={16} surface="light" title="Reviews" />
          <Typewriter text={GUIDE_PUBLIC_COPY.reviewsHeading} speed={70} waitTime={8000} />
        </h2>

        {ratingCount === 0 ? (
          <p className="text-sm text-[#64748B]">No reviews yet.</p>
        ) : (
          <>
            <div className="mb-6 flex items-end gap-4">
              <span className="font-mono text-4xl font-bold tabular-nums text-[#0B1220]">
                {avgRating?.toFixed(1) ?? "—"}
              </span>
              <div className="flex-1">
                {ratingDistribution.map((dist, i) => (
                  <div key={dist.star} className="mb-1 flex items-center gap-3">
                    <span className="w-14 shrink-0 font-mono text-xs text-[#64748B]">{dist.star} star</span>
                    <div className="h-1 flex-1 overflow-hidden rounded bg-[#E2E8F0]">
                      <div
                        ref={(el) => {
                          if (el) ratingBarRefs.current[i] = el;
                        }}
                        className="h-full origin-left rounded bg-[#6366F1]"
                        style={{ transform: "scaleX(0)" }}
                      />
                    </div>
                    <span className="w-4 shrink-0 text-right font-mono text-xs text-[#64748B]">{dist.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              {reviews.map((review, i) => (
                <div
                  key={i}
                  ref={(el) => {
                    if (el) reviewRefs.current[i] = el;
                  }}
                  className="border-b border-[#E2E8F0] py-4 last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm text-[#64748B]">{review.rating} / 5</span>
                    <span className="text-xs text-[#94A3B8]">{relativeDate(review.created_at)}</span>
                  </div>
                  {review.comment ? (
                    <p className={cn("mt-2 text-sm leading-relaxed text-[#475569]")}>{review.comment}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </>
        )}
      </GuideAnimatedSticky>
    </section>
  );
}
