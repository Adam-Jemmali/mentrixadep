"use client";

import { buildSessionIcsCalendar } from "@/lib/calendar-ics";
import Image from "next/image";
import { Button } from "@/components/ui/button";

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
      <Image src="/images/book.png" alt="Calendar" width={16} height={16} />
      Add to calendar (.ics)
    </Button>
  );
}
