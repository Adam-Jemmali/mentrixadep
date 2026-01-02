"use client";

import { useState } from "react";
import { CancelSessionButton } from "./cancel-session-button";
import { RateSessionForm } from "./rate-session-form";
import { JoinVideoCallButton } from "@/components/join-video-call-button";
import { formatDate, formatTimeRange } from "@/lib/time-format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Session {
  id: string;
  course: string;
  start_time: string;
  end_time: string;
  completed: boolean;
  tutor?: {
    id: string;
    role: string;
  };
  ratings?: Array<{
    id: string;
    rating: number;
    comment: string | null;
  }>;
}

interface SessionsListProps {
  upcomingSessions: Session[];
  pastSessions: Session[];
}

export function SessionsList({ upcomingSessions, pastSessions }: SessionsListProps) {
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">My Sessions</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "upcoming" | "past")} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="upcoming">
              Upcoming ({upcomingSessions.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              Past ({pastSessions.length})
            </TabsTrigger>
          </TabsList>

          <div className="space-y-4">
            {activeTab === "upcoming" ? (
              upcomingSessions.length === 0 ? (
                <div className="py-12">
                  <p className="text-center text-muted-foreground">
                    No upcoming sessions
                  </p>
                </div>
              ) : (
                upcomingSessions.map((session) => (
                  <SessionCard key={session.id} session={session} type="upcoming" />
                ))
              )
            ) : (
              pastSessions.length === 0 ? (
                <div className="py-12">
                  <p className="text-center text-muted-foreground">
                    No past sessions
                  </p>
                </div>
              ) : (
                pastSessions.map((session) => (
                  <SessionCard key={session.id} session={session} type="past" />
                ))
              )
            )}
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function SessionCard({
  session,
  type,
}: {
  session: Session;
  type: "upcoming" | "past";
}) {
  const hasRating = session.ratings && session.ratings.length > 0;

  return (
    <div className="border border-border rounded-xl p-5 bg-card hover:border-primary/20 hover:shadow-md transition-all">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-bold text-lg">
                {session.course.charAt(0)}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-lg text-foreground">{session.course}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {formatDate(session.start_time)} • {formatTimeRange(session.start_time, session.end_time)}
              </p>
            </div>
          </div>
        </div>
        {type === "upcoming" && (
          <div className="flex flex-col items-end gap-2">
            <JoinVideoCallButton
              sessionId={session.id}
              startTime={session.start_time}
              endTime={session.end_time}
            />
            <CancelSessionButton sessionId={session.id} startTime={session.start_time} />
          </div>
        )}
      </div>
      {type === "past" && (
        <div className="mt-4 pt-4 border-t border-border">
          {!session.completed ? (
            <p className="text-sm text-muted-foreground">
              Session pending completion
            </p>
          ) : hasRating && session.ratings && session.ratings.length > 0 ? (
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Your Rating:</p>
              <div className="flex items-center gap-2">
                <span className="text-warning">
                  {"★".repeat(session.ratings[0]!.rating)}
                  {"☆".repeat(5 - session.ratings[0]!.rating)}
                </span>
                <span className="text-sm text-muted-foreground">
                  {session.ratings[0]!.rating}/5
                </span>
              </div>
              {session.ratings[0]!.comment && (
                <p className="text-sm text-muted-foreground mt-1">
                  {session.ratings[0]!.comment}
                </p>
              )}
            </div>
          ) : (
            <RateSessionForm sessionId={session.id} />
          )}
        </div>
      )}
    </div>
  );
}
