"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchParams } from "next/navigation";
import { QuestClassicWorkspace } from "./quest-classic-workspace";
import { QuestPracticeWorkspace } from "./quest-practice-workspace";

export function QuestPageClient({
  subjectOptions,
}: {
  subjectOptions: { key: string; name: string }[];
}) {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const defaultTab = tab === "classic" ? "classic" : "practice";

  return (
    <div className="bg-slate-50 min-h-0 md:min-h-[calc(100dvh-3.5rem)]">
      <Tabs defaultValue={defaultTab} className="w-full">
        <div className="border-b border-slate-200 bg-white px-4 sm:px-6 pt-4">
          <TabsList className="bg-slate-100/80">
            <TabsTrigger value="practice">Practice packs</TabsTrigger>
            <TabsTrigger value="classic">Problem solver</TabsTrigger>
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
