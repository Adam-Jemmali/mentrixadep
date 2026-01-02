import { requireRole } from "@/lib/auth";
import {
  getTutorAvailability,
  getUpcomingSessions,
  getPastSessions,
  getSessionRequests,
  getAutoApprove,
} from "@/app/actions/tutor";
import { AvailabilityManager } from "./availability-manager";
import { SessionsList } from "./sessions-list";
import { SessionRequestsList } from "./session-requests-list";
import { AutoApproveToggle } from "./auto-approve-toggle";

export default async function TutorPage() {
  const user = await requireRole(["tutor", "admin"]);

  const [availability, upcomingSessions, pastSessions, sessionRequests, autoApprove] =
    await Promise.all([
      getTutorAvailability(),
      getUpcomingSessions(),
      getPastSessions(),
      getSessionRequests(),
      getAutoApprove(),
    ]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="section-container">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Provider Dashboard</h1>
              <p className="text-sm text-muted-foreground">Manage your services and orders</p>
            </div>
          </div>
        </div>
      </header>

      <div className="section-container py-6">
        <div className="mb-6">
          <AutoApproveToggle initialValue={autoApprove} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <AvailabilityManager availability={availability} />
            <SessionsList
              upcomingSessions={upcomingSessions}
              pastSessions={pastSessions}
            />
          </div>
          <div className="space-y-6">
            <SessionRequestsList sessionRequests={sessionRequests} />
          </div>
        </div>
      </div>
    </div>
  );
}
