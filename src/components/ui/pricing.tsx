"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TimelineContent } from "@/components/ui/timeline-animation";
import { VerticalCutReveal } from "@/components/ui/vertical-cut-reveal";
import { cn } from "@/lib/utils";
import NumberFlow from "@number-flow/react";

import Image from "next/image";
import { CheckCheck, GraduationCap, ShieldCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef } from "react";
import Link from "next/link";

const pricingHighlights = [
  {
    name: "Mentrixers",
    description: "Free to compete and progress. You only pay when you book a Guide.",
    price: 0,
    label: "Always Free",
    buttonText: "Start Learning",
    buttonLink: "/auth/signup",
    icon: (
      <div className="relative h-6 w-6 shrink-0">
        <Image
          src="/icons/mentrixer.svg"
          alt="Mentrixer"
          fill
          className="object-contain"
          sizes="24px"
        />
      </div>
    ),
    features: [
      "Access every Quest & Division",
      "Join or create Clans",
      "Climb global leaderboards",
      "Track your progress stats"
    ],
    popular: false,
  },
  {
    name: "Sessions",
    description: "Personalized mastery with expert Guides. No surprise fees.",
    price: 15,
    maxPrice: 60,
    label: "CAD / hr",
    buttonText: "Browse Guides",
    buttonLink: "/auth/signup",
    icon: <GraduationCap className="text-orange-500" size={24} />,
    popular: true,
    features: [
      "Rates between $15 - $60/hr",
      "15% fee included in price",
      "Secure Stripe checkout",
      "No monthly subscriptions"
    ],
  },
  {
    name: "Guides",
    description: "Share your expertise and grow the next generation of Mentrixers.",
    price: 15,
    maxPrice: 60,
    label: "Set your rate",
    buttonText: "Become a Guide",
    buttonLink: "/auth/signup",
    icon: (
      <div className="relative h-6 w-6 shrink-0">
        <Image
          src="/icons/guide.svg"
          alt="Guide"
          fill
          className="object-contain"
          sizes="24px"
        />
      </div>
    ),
    features: [
      "Set your own hourly rate",
      "Instant payout after sessions",
      "Build your expert profile",
      "Manage your own availability"
    ],
    popular: false,
  },
];

export default function PricingSection() {
  const pricingRef = useRef<HTMLDivElement>(null);

  const revealVariants = {
    visible: (i: number) => ({
      y: 0,
      opacity: 1,
      filter: "blur(0px)",
      transition: {
        delay: i * 0.2,
        duration: 0.5,
      },
    }),
    hidden: {
      filter: "blur(10px)",
      y: -20,
      opacity: 0,
    },
  };

  return (
    <section
      className="px-4 py-24 min-h-screen max-w-7xl mx-auto relative overflow-hidden"
      id="pricing"
      ref={pricingRef}
    >
      {/* Background Decor */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-orange-500/5 rounded-full blur-[120px]" />
      </div>

      <article className="text-center mb-16 space-y-6 max-w-3xl mx-auto">
        <TimelineContent
          as="p"
          animationNum={0}
          timelineRef={pricingRef}
          customVariants={revealVariants}
          className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600"
        >
          Pricing Model
        </TimelineContent>

        <h2 className="md:text-6xl text-4xl font-bold text-slate-900 tracking-tight leading-tight">
          <VerticalCutReveal
            splitBy="words"
            staggerDuration={0.1}
            staggerFrom="first"
            reverse={true}
            containerClassName="justify-center"
            transition={{
              type: "spring",
              stiffness: 250,
              damping: 40,
            }}
          >
            Transparent pricing for every mastery level
          </VerticalCutReveal>
        </h2>

        <TimelineContent
          as="p"
          animationNum={1}
          timelineRef={pricingRef}
          customVariants={revealVariants}
          className="md:text-xl text-slate-600 leading-relaxed"
        >
          Your account is free. Pay nothing until you book a Guide. 
          The price you see is always the price you pay.
        </TimelineContent>
      </article>

      <div className="grid md:grid-cols-3 gap-8 py-6">
        {pricingHighlights.map((highlight, index) => (
          <TimelineContent
            key={highlight.name}
            as="div"
            animationNum={2 + index}
            timelineRef={pricingRef}
            customVariants={revealVariants}
          >
            <Card
              className={cn(
                "h-full relative border border-slate-200 transition-all duration-300",
                highlight.popular
                  ? "ring-2 ring-blue-500 bg-white shadow-2xl shadow-blue-500/10"
                  : "bg-white/50 backdrop-blur-sm hover:shadow-xl"
              )}
            >
              <CardHeader className="text-left pb-4">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm">
                    {highlight.icon}
                  </div>
                
                </div>
                
                <h3 className="text-2xl font-bold text-slate-900">
                  {highlight.name}
                </h3>
                
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                  {highlight.description}
                </p>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-slate-900">
                    {highlight.price === 0 ? "" : "$"}
                    <NumberFlow
                      value={highlight.price}
                      className="text-4xl font-bold"
                    />
                    {highlight.maxPrice && (
                      <span className="text-4xl font-bold"> - ${highlight.maxPrice}</span>
                    )}
                  </span>
                  <span className="text-slate-400 text-sm font-medium ml-1">
                    {highlight.label}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="pt-4 flex flex-col h-[calc(100%-180px)]">
                <div className="space-y-4 mb-8">
                  <ul className="space-y-3">
                    {highlight.features.map((feature, fIndex) => (
                      <li key={fIndex} className="flex items-center gap-3">
                        <div className="shrink-0 h-5 w-5 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center">
                          <CheckCheck className="h-3 w-3 text-blue-600" />
                        </div>
                        <span className="text-sm text-slate-600 font-medium">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-auto pt-6 border-t border-slate-100">
                  <Button asChild variant={highlight.popular ? "default" : "secondary"} className="w-full xxl">
                    <Link href={highlight.buttonLink}>
                      {highlight.buttonText}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TimelineContent>
        ))}
      </div>

      <TimelineContent
        animationNum={5}
        timelineRef={pricingRef}
        customVariants={revealVariants}
        className="mt-20 grid md:grid-cols-2 gap-12 border-t border-slate-100 pt-16"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <ShieldCheck size={24} />
            </div>
            <h4 className="text-xl font-bold text-slate-900">Secure & Trusted</h4>
          </div>
          <p className="text-slate-600 leading-relaxed">
            Checkout is handled via Stripe. Your card data never touches our servers. 
            Guides receive payouts automatically after every completed session.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Wallet size={24} />
            </div>
            <h4 className="text-xl font-bold text-slate-900">Platform Transparency</h4>
          </div>
          <p className="text-slate-600 leading-relaxed">
            The 15% platform fee is already baked into the price you see on every Guide&apos;s profile. 
            No hidden charges or unexpected fees at checkout. Ever!
          </p>
        </div>
      </TimelineContent>
    </section>
  );
}
