import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Image from "next/image";
import { HomePageClient } from "@/components/home-page-client";
import { FirstSequenceHeroContent } from "@/components/first-sequence-hero-content";
import { SecondSequenceOutcomeContent } from "@/components/second-sequence-outcome-content";
import { ThirdStaticFeaturesContent } from "@/components/third-static-features-content";
import { ThirdSequenceWhyContent } from "@/components/third-sequence-why-content";
import { FourthStaticFlowContent } from "@/components/fourth-static-flow-content";
import { FourthStaticSidesCarouselContent } from "@/components/fourth-static-sides-carousel-content";
import { getSiteUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

const ScrollSequence = dynamic(() => import("@/components/scroll-sequence-wrapper"), {
  ssr: false,
});

export const metadata: Metadata = {
  title: `${SITE_NAME} — Live tutoring, quests & divisions`,
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
      <ScrollSequence sequenceId="firstseq" framePath="/sequences-webp/firstseq" totalFrames={120} height={5}>
        <FirstSequenceHeroContent />
      </ScrollSequence>
      <ScrollSequence sequenceId="secondseq" framePath="/sequences-webp/2ndseq" totalFrames={120} height={5}>
        <SecondSequenceOutcomeContent />
      </ScrollSequence>
      <ThirdStaticFeaturesContent />
      <section id="thirdseq" className="relative min-h-screen overflow-hidden">
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
      <ScrollSequence sequenceId="fourthseq" framePath="/sequences-webp/4thseq" totalFrames={120} height={5}>
        <FourthStaticFlowContent />
      </ScrollSequence>
      <FourthStaticSidesCarouselContent />
      <HomePageClient />
    </>
  );
}
