"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { mentrixStudent } from "@/lib/mentrix-student-ui";
import { QuestClassicWorkspace } from "./quest-classic-workspace";
import { QuestPracticeWorkspace } from "./quest-practice-workspace";

export function QuestPageClient({
  subjectOptions,
}: {
  subjectOptions: { key: string; name: string }[];
}) {
  const searchParams = useSearchParams();
  const hasPrompt = !!searchParams.get("prompt")?.trim();
  const initialTab =
    searchParams.get("tab") === "classic" || hasPrompt ? "classic" : "practice";
  const [activeTab, setActiveTab] = useState<"practice" | "classic">(initialTab);

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
        <div className="border-b border-slate-200/80 bg-white/95 px-4 shadow-[0_4px_24px_-12px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:px-6 pt-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Mentrixer training
          </p>
          <h1 className="mt-1 text-lg font-bold text-slate-900 sm:text-xl">Quest workspace</h1>
          <p className="mt-0.5 text-sm text-slate-600">Practice now. Build streak.</p>
          <TabsList className="mt-4 inline-flex h-auto w-full flex-wrap gap-1 rounded-2xl bg-slate-100 p-1.5 sm:w-auto">
            <TabsTrigger
              value="practice"
              className="rounded-xl px-4 py-2.5 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-md"
            >
              Practice packs
            </TabsTrigger>
            <TabsTrigger
              value="classic"
              className="rounded-xl px-4 py-2.5 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-md"
            >
              Problem solver
            </TabsTrigger>
          </TabsList>
        </div>
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
