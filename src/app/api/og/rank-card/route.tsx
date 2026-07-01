import { ImageResponse } from "next/og";
import { loadOgRankCardData } from "@/features/rank-card/og-rank-card-data";
import { getAccountRankByLevel, normalizeRankTitle } from "@/features/xp/rank-icons";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";
import { rankProofsCountLabel } from "@/features/xp/rank-proofs-labels";

/** Node runtime — @vercel/og exceeds the 1 MB Edge bundle limit on Hobby. */
export const runtime = "nodejs";

const VERIFIED_GOLD = "#D4A017";

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

  const rankVisual = getAccountRankByLevel(card.rankLevel);
  const isTopTier = rankVisual.key === "mentrixer";

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
          background: "linear-gradient(145deg, #070d1a 0%, #0B1220 50%, #0F172A 100%)",
          color: "#f8fafc",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 760 }}>
            <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: "0.16em", color: "#a5b4fc" }}>
              VERIFIED RANK PASSPORT
            </div>
            <div style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.05 }}>{card.displayName}</div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: isTopTier ? VERIFIED_GOLD : rankVisual.color,
              }}
            >
              {normalizeRankTitle(card.rankTitle)}
            </div>
          </div>
          <div
            style={{
              width: 108,
              height: 108,
              borderRadius: 20,
              background: "#0A0A0A",
              border: `3px solid ${isTopTier ? VERIFIED_GOLD : rankVisual.color}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 44,
              color: isTopTier ? VERIFIED_GOLD : rankVisual.color,
            }}
          >
            ★
          </div>
        </div>

        <div
          style={{
            marginTop: 28,
            padding: 32,
            borderRadius: 24,
            background: "rgba(15, 23, 42, 0.92)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {card.topPercentGold != null ? (
            <div style={{ fontSize: 34, fontWeight: 700, lineHeight: 1.25, color: "#f8fafc" }}>
              Top{" "}
              <span style={{ color: VERIFIED_GOLD, fontWeight: 900 }}>{card.topPercentGold}</span>{" "}
              percent of everyone verified on {AP_CALC_AB_SUBJECT}, first attempt only, no retakes
            </div>
          ) : (
            <div style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.35, color: "#e2e8f0" }}>
              {card.passportVerdictText}
            </div>
          )}
          {card.verifiedSkillCount > 0 ? (
            <div style={{ fontSize: 16, color: "#64748b" }}>
              {rankProofsCountLabel(card.verifiedSkillCount)}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 14, color: "#64748b" }}>
            Server verified. First attempts only.
          </div>
          <div style={{ fontSize: 18, color: "#94a3b8", fontFamily: "monospace" }}>
            mentrixa.one/rank/{username}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
