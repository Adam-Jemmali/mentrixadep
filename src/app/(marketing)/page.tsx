import type { Metadata } from "next";
import Image from "next/image";
import { HomePageClient } from "@/components/home-page-client";
import { FirstSequenceHeroContent } from "@/components/first-sequence-hero-content";
import { SecondSequenceOutcomeContent } from "@/components/second-sequence-outcome-content";
import { ThirdStaticFeaturesContent } from "@/components/third-static-features-content";
import { ThirdSequenceWhyContent } from "@/components/third-sequence-why-content";
import { FourthStaticFlowContent } from "@/components/fourth-static-flow-content";
import { FourthStaticSidesCarouselContent } from "@/components/fourth-static-sides-carousel-content";
import { LandingStoryBridge } from "@/components/landing-story-bridge";
import { getSiteUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";
import { MarketingScrollSequenceDynamic as ScrollSequence } from "@/components/marketing-scroll-sequence-dynamic";

export const metadata: Metadata = {
  title: `${SITE_NAME}, Live tutoring, quests & divisions`,
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: getSiteUrl(),
  },
  openGraph: {
    url: getSiteUrl(),
    title: `${SITE_NAME} — Live tutoring, quests & divisions`,
    description: SITE_DESCRIPTION,
  },
};

export default function Home() {
  return (
    <>
      <ScrollSequence sequenceId="firstseq" framePath="/sequences-webp/firstseq" totalFrames={120} height={2.2}>
        <FirstSequenceHeroContent />
      </ScrollSequence>

      <LandingStoryBridge
        chapter="Chapter 01"
        title="From confusion to clarity"
        subtitle="You book quickly, meet a real Guide, and get momentum in one pass."
      />

      <ScrollSequence sequenceId="secondseq" framePath="/sequences-webp/2ndseq" totalFrames={120} height={2.1}>
        <SecondSequenceOutcomeContent />
      </ScrollSequence>

      <LandingStoryBridge
        chapter="Chapter 02"
        title="Everything becomes measurable"
        subtitle="Your outcomes, quests, duels, and rank all connect into one progression arc."
      />

      <ThirdStaticFeaturesContent />

      <section id="thirdseq" className="relative min-h-[82vh] overflow-hidden">
        <Image
          src="/sequences-webp/3rdseq/frame-035.webp"
          alt="Mentrix AI tutoring overview"
          fill
          priority={false}
          className="object-cover"
          sizes="100vw"
        />
        <ThirdSequenceWhyContent />
      </section>

      <LandingStoryBridge
        chapter="Chapter 03"
        title="A clear 4-step loop"
        subtitle="Book, meet, unpack, and climb. Every step feeds the next one automatically."
      />

      <ScrollSequence sequenceId="fourthseq" framePath="/sequences-webp/4thseq" totalFrames={120} height={2}>
        <FourthStaticFlowContent />
      </ScrollSequence>

      <FourthStaticSidesCarouselContent />
      <HomePageClient />
    </>
  );
}
