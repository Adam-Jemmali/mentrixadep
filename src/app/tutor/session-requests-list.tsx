"use client";

import { useState } from "react";
import { approveSessionRequest, rejectSessionRequest } from "@/app/actions/tutor";
import { useRouter } from "next/navigation";
import { formatDate, formatTimeRange } from "@/lib/time-format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle } from "lucide-react";

interface SessionRequest {
  id: string;
  student_id: string;
  status: string;
  created_at: string;
  availability?: {
    course: string;
    start_time: string;
    end_time: string;
  };
}

interface SessionRequestsListProps {
  sessionRequests: SessionRequest[];
}

export function SessionRequestsList({ sessionRequests }: SessionRequestsListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Pending Requests</CardTitle>
      </CardHeader>
      <CardContent>
        {sessionRequests.length === 0 ? (
          <div className="py-12">
            <p className="text-center text-muted-foreground">
              No pending session requests
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessionRequests.map((request) => (
              <SessionRequestCard key={request.id} request={request} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SessionRequestCard({ request }: { request: SessionRequest }) {
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleApprove() {
    setLoading("approve");
    setError(null);
    try {
      await approveSessionRequest(request.id);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve request");
      setLoading(null);
    }
  }

  async function handleReject() {
    setLoading("reject");
    setError(null);
    try {
      await rejectSessionRequest(request.id);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject request");
      setLoading(null);
    }
  }

  return (
    <div className="border border-border rounded-xl p-5 bg-card hover:border-primary/20 hover:shadow-md transition-all">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4 flex-1">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-bold text-lg">
              {(request.availability?.course || "?").charAt(0)}
            </span>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-lg text-foreground">
              {request.availability?.course || "Unknown Course"}
            </p>
            {request.availability && (
              <>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {formatDate(request.availability.start_time)}
                </p>
                <p className="text-sm font-medium text-primary mt-0.5">
                  {formatTimeRange(
                    request.availability.start_time,
                    request.availability.end_time
                  )}
                </p>
              </>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Student ID: {request.student_id.substring(0, 8)}...
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {error && (
            <p className="text-xs text-destructive max-w-[150px] text-right">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button
              onClick={handleApprove}
              disabled={loading !== null}
              size="sm"
              className="bg-success hover:bg-success/90"
            >
              <CheckCircle size={16} className="mr-2" />
              {loading === "approve" ? "Approving..." : "Approve"}
            </Button>
            <Button
              onClick={handleReject}
              disabled={loading !== null}
              variant="destructive"
              size="sm"
            >
              <XCircle size={16} className="mr-2" />
              {loading === "reject" ? "Rejecting..." : "Reject"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
