"use client";

import { buildSessionIcsCalendar } from "@/features/booking/calendar-ics";
import { Button } from "@/shared/ui/button";
import { Calendar } from "lucide-react";

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
    <Button 
      type="button" 
      variant="outline" 
      size="lg"
      className="w-full gap-2 border-slate-700 text-slate-200 hover:text-white font-bold" 
      onClick={download}
    >
      <Calendar className="w-4 h-4 text-primary" />
      Add to calendar (.ics)
    </Button>
  );
}
