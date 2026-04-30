"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { TutorAvatar } from "./tutor-avatar";
import { StudyPackagePanel } from "./study-package-panel";
import { DeletePastSessionButton } from "@/components/delete-past-session-button";
import { RateSessionForm } from "../rate-session-form";
import { formatDateInZone, formatTimeInZone } from "@/lib/time-format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { StudentSessionTutorProfile } from "@/app/actions/student";
import type { SessionAiPackage } from "@/lib/database.types";

type RatingRow = { id: string; rating: number; comment: string | null };

type Session = {
  id: string;
  course: string;
  start_time: string;
  end_time: string;
  completed: boolean;
  status?: string;
  tutor_id?: string | null;
  tutor?: StudentSessionTutorProfile;
  ratings?: RatingRow[];
  ai_package?: SessionAiPackage | null;
};

export function PastSessionCard({ 
  session, 
  displayTimeZone = "UTC" 
}: { 
  session: Session;
  displayTimeZone?: string;
}) {
  const router = useRouter();
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [packageOpen, setPackageOpen] = useState(false);

  const emailPrefix = session.tutor?.email?.split("@")[0] ?? "Guide";
  const name = session.tutor?.display_name?.trim() || emailPrefix;
  const statusLower = (session.status ?? "").toLowerCase();
  const isCompleted = statusLower === "completed" || session.completed === true;
  const hasRating = !!(session.ratings && session.ratings.length > 0);
  const rating = hasRating ? session.ratings![0]!.rating : null;
  const sessionEndedBySchedule = new Date(session.end_time) <= new Date();
  const sessionDoneForUi = isCompleted || sessionEndedBySchedule;
  const hasTutor = !!(session.tutor_id ?? session.tutor?.id);
  const canRate = !hasRating && statusLower !== "cancelled" && hasTutor;
  const pkg = session.ai_package ?? null;

  const handleQuestClick = (prompt: string) => {
    router.push("/student/quest?prompt=" + encodeURIComponent(prompt));
  };

  return (
    <>
      <article
        data-session-id={session.id}
        className="session-card session-table-row space-y-4 rounded-md border border-slate-200 bg-white p-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <TutorAvatar
              displayName={session.tutor?.display_name}
              emailPrefix={emailPrefix}
              avatarUrl={session.tutor?.avatar_url}
            />
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-900">{name}</p>
              <Badge variant="outline" className="mt-1 text-[10px] font-mono border-slate-300">
                {session.course}
              </Badge>
              <p className="mt-2 text-sm text-slate-600">
                {formatDateInZone(session.start_time, displayTimeZone)} · {formatTimeInZone(session.start_time, displayTimeZone)} –{" "}
                {formatTimeInZone(session.end_time, displayTimeZone)}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
            {statusLower === "cancelled" ? (
              <Badge variant="outline" className="border-slate-300 bg-slate-100 text-slate-700">
                Cancelled
              </Badge>
            ) : sessionDoneForUi ? (
              <Badge variant="outline" className="border-slate-800 bg-slate-900 text-white">
                Completed
              </Badge>
            ) : (
              <Badge variant="outline">Ended</Badge>
            )}

            {hasRating ? (
              <div className="flex items-center gap-1" aria-label={`Rated ${rating} out of 5`}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Image
                    key={s}
                    src={s <= (rating ?? 0) ? "/images/xp.png" : "/images/pending.png"}
                    alt="Star"
                    width={16}
                    height={16}
                    className="h-4 w-4"
                  />
                ))}
              </div>
            ) : canRate ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-slate-300 text-slate-800"
                onClick={() => setRatingDialogOpen(true)}
              >
                Rate session
              </Button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          {sessionDoneForUi ? (
            <Collapsible open={packageOpen} onOpenChange={setPackageOpen}>
              <CollapsibleTrigger asChild>
                <Button type="button" size="sm" variant="outline" className="gap-1 text-black">
                  <Image src="/images/package.png" alt="Package" width={16} height={16} />
                  View Study Package
                  <Image
                    src="/images/pending.png"
                    alt="Toggle"
                    width={16}
                    height={16}
                    className={`transition ${packageOpen ? "rotate-180" : ""}`}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-4">
                <StudyPackagePanel
                  sessionId={session.id}
                  initialPackage={pkg}
                  onQuestClick={handleQuestClick}
                />
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <span className="text-xs text-slate-500">Studio output pending session completion.</span>
          )}

          <div className="ml-auto">
            <DeletePastSessionButton
              sessionId={session.id}
              endTime={session.end_time}
              allowRemoveBeforeScheduledEnd={isCompleted || session.status === "cancelled"}
            />
          </div>
        </div>
      </article>

      <Dialog open={ratingDialogOpen} onOpenChange={setRatingDialogOpen}>
        <DialogContent className="border border-slate-300 bg-white text-slate-900 shadow-xl dark:border-slate-300 dark:bg-white dark:text-slate-900">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Rate your session</DialogTitle>
            <DialogDescription className="text-sm text-slate-700 leading-relaxed">
              Choose a star rating and optional note for your Guide.
            </DialogDescription>
          </DialogHeader>
          <RateSessionForm
            sessionId={session.id}
            canRate={canRate}
            onSuccess={() => {
              setRatingDialogOpen(false);
              router.refresh();
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
