"use client";

import { useState } from "react";
import { cancelSession } from "@/app/actions/tutor";
import { useRouter } from "next/navigation";
import { JoinVideoCallButton } from "@/components/join-video-call-button";
import { formatDate, formatTimeRange } from "@/lib/time-format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle } from "lucide-react";

interface Session {
  id: string;
  course: string;
  start_time: string;
  end_time: string;
  completed: boolean;
  student?: {
    id: string;
  };
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleCancel() {
    if (!confirm("Are you sure you want to cancel this session?")) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await cancelSession(session.id);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel session");
      setLoading(false);
    }
  }

  return (
    <div className="border border-border rounded-xl p-5 bg-card hover:border-primary/20 hover:shadow-md transition-all">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4 flex-1">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-bold text-lg">
              {session.course.charAt(0)}
            </span>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-foreground">{session.course}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {formatDate(session.start_time)} • {formatTimeRange(session.start_time, session.end_time)}
            </p>
            {session.completed && (
              <span className="inline-block mt-2 px-3 py-1 bg-success/10 text-success rounded-lg text-xs font-semibold">
                <CheckCircle size={12} className="inline mr-1" />
                Completed
              </span>
            )}
          </div>
        </div>
        {type === "upcoming" && (
          <div className="flex flex-col items-end gap-2">
            {error && (
              <p className="text-xs text-destructive max-w-[150px] text-right">{error}</p>
            )}
            <JoinVideoCallButton
              sessionId={session.id}
              startTime={session.start_time}
              endTime={session.end_time}
            />
            <Button
              onClick={handleCancel}
              disabled={loading}
              variant="destructive"
              size="sm"
            >
              {loading ? "Cancelling..." : "Cancel"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
