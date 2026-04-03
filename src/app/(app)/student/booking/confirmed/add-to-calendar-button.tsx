"use client";

import { buildSessionIcsCalendar } from "@/lib/calendar-ics";
import { Button } from "@/components/ui/button";
import { CalendarPlus } from "lucide-react";

type Props = {
  requestId: string;
  title: string;
  description: string;
  startIso: string;
  endIso: string;
};

export function AddToCalendarButton({ requestId, title, description, startIso, endIso }: Props) {
  function download() {
    const start = new Date(startIso);
    const end = new Date(endIso);
    const ics = buildSessionIcsCalendar({
      uid: `mentrixa-session-request-${requestId}@mentrixa`,
      title,
      description,
      location: `${typeof window !== "undefined" ? window.location.origin : ""}/student`,
      start,
      end,
    });
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mentrixa-session-${requestId.slice(0, 8)}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button type="button" variant="outline" className="gap-2" onClick={download}>
      <CalendarPlus className="h-4 w-4" aria-hidden />
      Add to calendar (.ics)
    </Button>
  );
}
