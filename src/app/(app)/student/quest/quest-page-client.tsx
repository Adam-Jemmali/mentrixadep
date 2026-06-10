"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { mentrixStudent } from "@/features/student-profile/mentrix-student-ui";
import { QuestClassicWorkspace } from "./quest-classic-workspace";
import { QuestPracticeWorkspace } from "./quest-practice-workspace";
import { Typewriter } from "@/shared/ui/typewriter";
import { TiltCard } from "@/shared/ui/tilt-card";
import { BackButton } from "@/shared/ui/back-button";

export function QuestPageClient({
  subjectOptions,
}: {
  subjectOptions: { key: string; name: string }[];
}) {
  const searchParams = useSearchParams();
  const onboardingMode = searchParams.get("onboarding") === "true";
  const initialTab = onboardingMode
    ? "practice"
    : searchParams.get("tab") === "practice"
      ? "practice"
      : "classic";
  const [activeTab, setActiveTab] = useState<"practice" | "classic">(initialTab);

  if (onboardingMode) {
    return (
      <div className={`${mentrixStudent.pageBg} min-h-screen`}>
        <div className="mx-auto w-full max-w-5xl px-4 pt-4 sm:px-6">
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/80 px-4 py-3 text-sm leading-relaxed text-indigo-950 shadow-sm">
             This is the Quest workspace. Where you can practice and build your skills and be #1 in the leaderboard. 
          </div>
        </div>
        <QuestPracticeWorkspace subjectOptions={subjectOptions} onboardingMode />
      </div>
    );
  }

  return (
    <div
      className={`${mentrixStudent.pageBg} min-h-0 md:min-h-[calc(100dvh-3.5rem)]`}
    >
      <Tabs
        value={activeTab}
        onValueChange={(next) =>
          setActiveTab(next === "classic" ? "classic" : "practice")
        }
        className="w-full"
      >
        <div className="mb-4">
          <BackButton />
        </div>
        <TiltCard
          tiltLimit={2}
          className="mx-surface-light block rounded-none border-b border-violet-200 px-4 pt-5 shadow-[0_4px_24px_-12px_rgba(15,23,42,0.08)] sm:px-6"
        >
          <p className={mentrixStudent.sectionEyebrowOnLight}>Mentrixer training</p>
          <h1 className={`mt-1 text-lg font-bold sm:text-xl h-[28px] ${mentrixStudent.textOnLight}`}>
            <Typewriter text="Quest workspace" speed={70} waitTime={8000} />
          </h1>
          <p className={`mt-0.5 text-sm ${mentrixStudent.textMutedOnLight}`}>Practice now. Build streak.</p>
          <TabsList className="mt-4 inline-flex h-auto w-full flex-wrap gap-1 rounded-2xl bg-violet-100/80 p-1.5 sm:w-auto">
            <TabsTrigger
              value="practice"
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-zinc-700 data-[state=active]:bg-white data-[state=active]:text-indigo-800 data-[state=active]:shadow-md"
            >
              Practice packs
            </TabsTrigger>
            <TabsTrigger
              value="classic"
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-zinc-700 data-[state=active]:bg-white data-[state=active]:text-indigo-800 data-[state=active]:shadow-md"
            >
              Problem solver
            </TabsTrigger>
          </TabsList>
        </TiltCard>
        <TabsContent value="practice" className="mt-0 focus-visible:outline-none">
          <QuestPracticeWorkspace subjectOptions={subjectOptions} />
        </TabsContent>
        <TabsContent value="classic" className="mt-0 min-h-0 focus-visible:outline-none md:min-h-[calc(100dvh-3.5rem)]">
          <QuestClassicWorkspace />
        </TabsContent>
      </Tabs>
    </div>
  );
}
