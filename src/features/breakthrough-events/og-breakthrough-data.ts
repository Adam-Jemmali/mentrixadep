import { supabaseRestSelect } from "@/shared/integrations/supabase/rest-fetch";

export type OgBreakthroughData =
  | { status: "not_found" }
  | {
      status: "ok";
      eventId: string;
      subject: string;
      concept: string;
      accuracyBefore: number;
      accuracyAfter: number;
      detectedAt: string;
    };

type BreakthroughRow = {
  id: string;
  subject: string;
  concept: string;
  accuracy_before: number | string;
  accuracy_after: number | string;
  detected_at: string;
};

/** Lightweight loader for breakthrough OG images. */
export async function loadOgBreakthroughData(eventId: string): Promise<OgBreakthroughData> {
  const id = eventId.trim();
  if (!id) return { status: "not_found" };

  const rows = await supabaseRestSelect<BreakthroughRow>(
    "breakthrough_events",
    `id=eq.${encodeURIComponent(id)}&select=id,subject,concept,accuracy_before,accuracy_after,detected_at&limit=1`,
  );

  const row = rows[0];
  if (!row) return { status: "not_found" };

  return {
    status: "ok",
    eventId: row.id,
    subject: row.subject,
    concept: row.concept,
    accuracyBefore: Number(row.accuracy_before),
    accuracyAfter: Number(row.accuracy_after),
    detectedAt: String(row.detected_at),
  };
}
