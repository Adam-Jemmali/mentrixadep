import { ImageResponse } from "next/og";
import { loadOgBreakthroughData } from "@/features/breakthrough-events/og-breakthrough-data";

/** Node runtime — @vercel/og exceeds the 1 MB Edge bundle limit on Hobby. */
export const runtime = "nodejs";

const MENTRIXER_GOLD = "#D4A017";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("event_id")?.trim();
  if (!eventId) {
    return new Response("Missing event_id", { status: 400 });
  }

  const event = await loadOgBreakthroughData(eventId);
  if (event.status === "not_found") {
    return new Response("Not found", { status: 404 });
  }

  const dateLabel = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
    new Date(event.detectedAt),
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 56,
          background: "linear-gradient(145deg, #070d1a 0%, #0b1220 50%, #111827 100%)",
          color: "#f8fafc",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              fontSize: 20,
              fontWeight: 900,
              letterSpacing: "0.35em",
              color: MENTRIXER_GOLD,
              textTransform: "uppercase",
            }}
          >
            Breakthrough
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "0.08em", color: "#818cf8" }}>
            MENTRIXA
          </div>
          <div style={{ fontSize: 52, fontWeight: 900, fontStyle: "italic", lineHeight: 1.1 }}>
            {event.concept}
          </div>
          <div style={{ fontSize: 36, fontWeight: 700, color: "#c7d2fe" }}>
            {Math.round(event.accuracyBefore)}% → {Math.round(event.accuracyAfter)}%
          </div>
          <div style={{ fontSize: 18, color: "#94a3b8" }}>{event.subject}</div>
        </div>

        <div
          style={{
            marginTop: 40,
            padding: 28,
            borderRadius: 24,
            background: "rgba(15, 23, 42, 0.75)",
            border: "1px solid rgba(129, 140, 248, 0.25)",
          }}
        >
          <div style={{ fontSize: 16, color: "#94a3b8" }}>Verified accuracy jump · {dateLabel}</div>
          <div style={{ marginTop: 8, fontSize: 18, color: "#64748b" }}>
            mentrixa.one/breakthrough/{event.eventId.slice(0, 8)}…
          </div>
        </div>

        <div style={{ fontSize: 14, color: "#475569", marginTop: 24 }}>
          Prove what you know · Public rank · Real stakes
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
