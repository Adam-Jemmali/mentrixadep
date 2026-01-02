"use client";

import { useState } from "react";
import { BookSessionButton } from "./book-session-button";
import { formatDate, formatTimeRange } from "@/lib/time-format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Clock } from "lucide-react";

interface Availability {
  id: string;
  tutor_id: string;
  course: string;
  start_time: string;
  end_time: string;
  tutor?: {
    id: string;
    role: string;
    approved: boolean;
    email?: string;
  };
}

interface AvailabilityBrowserProps {
  availability: Availability[];
  courses: string[];
}

interface TutorProfile {
  id: string;
  email: string;
  courses: string[];
  availability: Availability[];
}

export function AvailabilityBrowser({
  availability,
  courses,
}: AvailabilityBrowserProps) {
  const [selectedCourse, setSelectedCourse] = useState<string>("all");

  // Group availability by tutor
  const tutorsMap = new Map<string, TutorProfile>();

  availability.forEach((avail) => {
    if (!avail.tutor || !avail.tutor.id) {
      return;
    }

    const tutorId = avail.tutor.id;
    if (!tutorsMap.has(tutorId)) {
      tutorsMap.set(tutorId, {
        id: tutorId,
        email: avail.tutor.email || "Unknown",
        courses: [],
        availability: [],
      });
    }

    const tutor = tutorsMap.get(tutorId)!;
    const courseLower = avail.course.toLowerCase();
    if (!tutor.courses.some((c) => c.toLowerCase() === courseLower)) {
      tutor.courses.push(avail.course);
    }
    tutor.availability.push(avail);
  });

  // Sort availability by start time for each tutor
  tutorsMap.forEach((tutor) => {
    tutor.availability.sort(
      (a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );
    tutor.courses.sort();
  });

  // Filter availability by course if selected, then filter out tutors with no availability
  const filteredTutorsWithAvailability = Array.from(tutorsMap.values())
    .map((tutor) => ({
      ...tutor,
      availability:
        selectedCourse === "all"
          ? tutor.availability
          : tutor.availability.filter(
              (a) => a.course.toLowerCase() === selectedCourse.toLowerCase()
            ),
    }))
    .filter((tutor) => tutor.availability.length > 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-2xl">Tutor Marketplace</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Find the perfect tutor for your needs
            </p>
          </div>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="px-4 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm font-medium"
          >
            <option value="all">All Courses</option>
            {courses.map((course) => (
              <option key={course} value={course}>
                {course}
              </option>
            ))}
          </select>
        </div>
      </CardHeader>
      <CardContent>
        {filteredTutorsWithAvailability.length === 0 ? (
          <div className="py-12">
            <p className="text-center text-muted-foreground">
              {selectedCourse === "all"
                ? "No tutors available"
                : `No tutors available for ${selectedCourse}`}
            </p>
            {availability.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground mt-2">
                No availability slots found in the database
              </p>
            ) : availability.length > 0 && selectedCourse !== "all" ? (
              <p className="text-center text-xs text-muted-foreground mt-2">
                Try selecting &quot;All Courses&quot; to see all available tutors
              </p>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTutorsWithAvailability.map((tutor) => (
              <TutorCard key={tutor.id} tutor={tutor} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TutorCard({ tutor }: { tutor: TutorProfile }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-6 hover:shadow-xl hover:border-primary/20 transition-all duration-300">
      <div className="mb-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-bold text-2xl">
                {tutor.email.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
              <Shield size={12} className="text-primary-foreground" />
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-lg text-foreground mb-1">
              {tutor.email.split("@")[0]}
            </h3>
            <p className="text-sm text-muted-foreground">
              {tutor.email}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-5">
        <p className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
          Courses Offered
        </p>
        <div className="flex flex-wrap gap-2">
          {tutor.courses.map((course) => (
            <span
              key={course}
              className="px-2 py-1 text-xs font-medium bg-muted rounded-md text-muted-foreground"
            >
              {course}
            </span>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
          Available Times
        </p>
        {tutor.availability.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No availability for selected course
          </p>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
            {tutor.availability.map((slot) => (
              <AvailabilitySlot key={slot.id} slot={slot} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AvailabilitySlot({ slot }: { slot: Availability }) {
  return (
    <div className="border border-border rounded-xl p-4 bg-muted/30 flex justify-between items-center hover:border-primary/50 hover:bg-muted/50 transition-all">
      <div className="flex-1">
        <p className="text-sm font-semibold text-foreground mb-1">
          {slot.course}
        </p>
        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
          <Clock size={12} />
          {formatDate(slot.start_time)}
        </p>
        <p className="text-sm font-medium text-primary">
          {formatTimeRange(slot.start_time, slot.end_time)}
        </p>
      </div>
      <BookSessionButton availabilityId={slot.id} />
    </div>
  );
}
