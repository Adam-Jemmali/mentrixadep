import { ImageResponse } from "next/og";
import { loadOgRankCardData } from "@/features/rank-card/og-rank-card-data";
import { getAccountRankByLevel, normalizeRankTitle } from "@/features/xp/rank-icons";
import { AP_CALC_AB_SUBJECT } from "@/features/quest/ap-calc-ab-subject";

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
  const tierGold = card.proofTier != null && card.proofTier >= 4;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 48,
          background: "linear-gradient(160deg, #070d1a 0%, #0B1220 55%, #0F172A 100%)",
          color: "#f8fafc",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 720 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: "0.12em",
                background: "linear-gradient(90deg, #4F46E5 0%, #6366F1 45%, #A855F7 100%)",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              MENTRIXA_
            </div>
            <div style={{ fontSize: 46, fontWeight: 800, lineHeight: 1.05 }}>{card.displayName}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: "1px solid rgba(124, 58, 237, 0.45)",
                  background: "rgba(124, 58, 237, 0.15)",
                  color: "#ddd6fe",
                }}
              >
                {AP_CALC_AB_SUBJECT}
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: isTopTier ? VERIFIED_GOLD : rankVisual.color,
                }}
              >
                {normalizeRankTitle(card.rankTitle)}
              </div>
            </div>
          </div>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 18,
              background: "#0A0A0A",
              border: `3px solid ${isTopTier ? VERIFIED_GOLD : rankVisual.color}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
              color: isTopTier ? VERIFIED_GOLD : rankVisual.color,
            }}
          >
            ★
          </div>
        </div>

        <div style={{ display: "flex", gap: 24, alignItems: "stretch" }}>
          <div
            style={{
              flex: "0 0 220px",
              padding: 24,
              borderRadius: 16,
              background: "rgba(15, 23, 42, 0.92)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: "#6366F1" }}>
              VERIFIED SKILL PROOF
            </div>
            {card.proofTier != null ? (
              <>
                <div style={{ fontSize: 52, fontWeight: 800, lineHeight: 1, color: tierGold ? VERIFIED_GOLD : "#fff" }}>
                  {card.proofTier}
                </div>
                <div style={{ fontSize: 13, color: "#94a3b8" }}>of 5 proof tiers</div>
              </>
            ) : (
              <div style={{ fontSize: 18, color: "#94a3b8", lineHeight: 1.35 }}>{card.passportVerdictText}</div>
            )}
            {card.topPercentGold != null ? (
              <div style={{ fontSize: 14, color: "#cbd5e1", marginTop: 8 }}>
                Top {card.topPercentGold}% of Mentrixers tested
              </div>
            ) : null}
          </div>

          <div
            style={{
              flex: 1,
              padding: 24,
              borderRadius: 16,
              background: "rgba(15, 23, 42, 0.72)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              alignContent: "flex-start",
            }}
          >
            {card.topNodes.map((node) => (
              <div
                key={node.name}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: node.verified ? VERIFIED_GOLD : "#334155",
                  border: node.verified ? `1px solid ${VERIFIED_GOLD}` : "1px solid #475569",
                }}
                title={node.name}
              />
            ))}
            {card.topNodes.length === 0 ? (
              <div style={{ fontSize: 14, color: "#64748b" }}>Mastery grid forming</div>
            ) : null}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 13, color: "#64748b" }}>
            {card.verifiedSkillCount} nodes verified · {Math.round(card.accuracyPercent)}% first attempt
          </div>
          <div style={{ fontSize: 16, color: "#94a3b8", fontFamily: "monospace" }}>
            mentrixa.one/rank/{username}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
