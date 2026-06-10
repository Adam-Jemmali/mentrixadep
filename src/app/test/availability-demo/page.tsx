"use client";

import { CreateAvailabilityCard } from "@/shared/ui/create-availability-card";

export default function AvailabilityDemoPage() {
  const dummyCourses = ["Mathematics", "Physics", "Computer Science", "Chemistry"];
  const dummyTimezone = "America/New_York";

  return (
    <div className="min-h-screen bg-slate-950 p-8 flex items-center justify-center">
      <div className="w-full max-w-2xl">
        <h1 className="text-white text-2xl font-bold mb-8 text-center">Premium Availability UI Preview</h1>
        <CreateAvailabilityCard
          tutorCourseNames={dummyCourses}
          defaultTimezone={dummyTimezone}
          sessionDefaultDurationMinutes={60}
        />
      </div>
    </div>
  );
}
