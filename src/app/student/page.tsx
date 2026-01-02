import { requireRole } from "@/lib/auth";
import {
  getUpcomingSessions,
  getPastSessions,
  getTutorAvailability,
  getAvailableCourses,
} from "@/app/actions/student";
import { SessionsList } from "./sessions-list";
import { AvailabilityBrowser } from "./availability-browser";

export default async function StudentPage() {
  const user = await requireRole(["student", "admin"]);

  const [upcomingSessions, pastSessions, availability, courses] = await Promise.all([
    getUpcomingSessions(),
    getPastSessions(),
    getTutorAvailability(),
    getAvailableCourses(),
  ]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="section-container">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
              <p className="text-sm text-muted-foreground">Welcome back, {user.email?.split("@")[0]}!</p>
            </div>
          </div>
        </div>
      </header>

      <div className="section-container py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SessionsList
            upcomingSessions={upcomingSessions}
            pastSessions={pastSessions}
          />
          <AvailabilityBrowser
            availability={availability}
            courses={courses}
          />
        </div>
      </div>
    </div>
  );
}
