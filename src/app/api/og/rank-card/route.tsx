import { ImageResponse } from "next/og";
import { loadOgRankCardData } from "@/features/rank-card/og-rank-card-data";
import { getAccountRankByLevel, normalizeRankTitle } from "@/features/xp/rank-icons";

/** Node runtime — @vercel/og exceeds the 1 MB Edge bundle limit on Hobby. */
export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username")?.trim().toLowerCase();
  if (!username) {
    return new Response("Missing username", { status: 400 });
  }

  const card = await loadOgRankCardData(username);
  if (card.status === "not_found") {
    return new Response("Not found", { status: 404 });
  }
  if (card.status === "private") {
    return new Response("Not found", { status: 404 });
  }

  const rankVisual = getAccountRankByLevel(card.globalRankLevel);

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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "0.08em", color: "#818cf8" }}>
              MENTRIXA
            </div>
            <div style={{ fontSize: 48, fontWeight: 900, fontStyle: "italic" }}>{card.displayName}</div>
            <div
              style={{
                fontSize: 22,
                color: rankVisual.color,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
              }}
            >
              {normalizeRankTitle(card.globalRankTitle)}
            </div>
          </div>
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 24,
              background: "#0A0A0A",
              border: `3px solid ${rankVisual.color}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 52,
              boxShadow: `0 0 40px ${rankVisual.colorMuted}`,
            }}
          >
            ★
          </div>
        </div>

        <div
          style={{
            marginTop: 40,
            padding: 32,
            borderRadius: 24,
            background: "rgba(15, 23, 42, 0.75)",
            border: "1px solid rgba(129, 140, 248, 0.25)",
          }}
        >
          <div style={{ fontSize: 16, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.15em" }}>
            Verified competitive performance
          </div>
          <div style={{ marginTop: 12, fontSize: 32, fontWeight: 700 }}>{card.subjectLine}</div>
          <div style={{ marginTop: 8, fontSize: 18, color: "#64748b" }}>
            mentrixa.one/rank/{username}
          </div>
        </div>

        <div style={{ fontSize: 14, color: "#475569", marginTop: 24 }}>
          Not self-reported · Demonstrated under pressure against real competition
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
