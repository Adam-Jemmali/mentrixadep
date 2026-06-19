"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/shared/integrations/supabase/client";
import { MENTRIXA_LOGO_PNG } from "@/features/marketing/mentrixa-brand";
import {
  getAccountRankFromTotalXp,
  normalizeRankTitle,
  type AccountRankVisual,
} from "@/features/xp/rank-icons";

type ScoreCardPayload = {
  title: string;
  playerName: string;
  correct: number | null;
  total: number | null;
  accuracy: number | null;
  xp: number;
  isPreview: boolean;
  dateLabel: string;
  rank: AccountRankVisual & { levelInfo: ReturnType<typeof getAccountRankFromTotalXp>["levelInfo"] };
  nextRankLabel: string | null;
};

function parseScorePayload(
  title: string,
  scoreLine: string,
  xpLine: string,
  playerName: string,
): ScoreCardPayload {
  const frac = scoreLine.match(/(\d+)\s*\/\s*(\d+)/);
  const pct = scoreLine.match(/(\d+)\s*%/);
  const correct = frac ? Number(frac[1]) : null;
  const total = frac ? Number(frac[2]) : null;
  const accuracy =
    pct != null
      ? Number(pct[1])
      : correct != null && total != null && total > 0
        ? Math.round((correct / total) * 100)
        : null;
  const xp = Number.parseInt((xpLine.match(/[0-9,]+/)?.[0] ?? "0").replace(/,/g, ""), 10) || 0;
  const rank = getAccountRankFromTotalXp(xp);
  const nextRankLabel =
    rank.levelInfo.xpToNextLevel != null
      ? `${rank.levelInfo.xpToNextLevel.toLocaleString()} XP → next rank`
      : null;

  return {
    title: title.trim() || "Quest run",
    playerName: playerName.trim() || "Mentrixer",
    correct,
    total,
    accuracy,
    xp,
    isPreview: xpLine.toLowerCase().includes("preview"),
    dateLabel: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
      new Date(),
    ),
    rank,
    nextRankLabel,
  };
}

function accentForAccuracy(accuracy: number | null): { primary: string; glow: string; muted: string } {
  if (accuracy == null) {
    return { primary: "#60a5fa", glow: "rgba(96,165,250,0.45)", muted: "rgba(96,165,250,0.14)" };
  }
  if (accuracy >= 90) {
    return { primary: "#34d399", glow: "rgba(52,211,153,0.5)", muted: "rgba(52,211,153,0.16)" };
  }
  if (accuracy >= 70) {
    return { primary: "#38bdf8", glow: "rgba(56,189,248,0.45)", muted: "rgba(56,189,248,0.14)" };
  }
  if (accuracy >= 50) {
    return { primary: "#fbbf24", glow: "rgba(251,191,36,0.4)", muted: "rgba(251,191,36,0.14)" };
  }
  return { primary: "#94a3b8", glow: "rgba(148,163,184,0.35)", muted: "rgba(148,163,184,0.1)" };
}

async function safeLoadImage(src: string): Promise<HTMLImageElement | null> {
  return await new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawProgressRing(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  stroke: number,
  pct: number,
  color: string,
  trackColor: string,
) {
  const start = -Math.PI / 2;
  const end = start + (Math.min(100, Math.max(0, pct)) / 100) * Math.PI * 2;

  ctx.lineWidth = stroke;
  ctx.lineCap = "round";

  ctx.strokeStyle = trackColor;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, start, end);
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawRankEmblem(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  rank: AccountRankVisual,
  icon: HTMLImageElement | null,
) {
  roundRect(ctx, x, y, size, size, 18);
  ctx.fillStyle = "rgba(15,23,42,0.92)";
  ctx.fill();
  ctx.strokeStyle = rank.color;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.save();
  roundRect(ctx, x + 8, y + 8, size - 16, size - 16, 14);
  ctx.clip();
  const glow = ctx.createRadialGradient(x + size / 2, y + size / 2, 8, x + size / 2, y + size / 2, size / 2);
  glow.addColorStop(0, rank.colorMuted);
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(x, y, size, size);
  ctx.restore();

  if (icon) {
    const pad = size * 0.22;
    ctx.drawImage(icon, x + pad, y + pad, size - pad * 2, size - pad * 2);
  }

  ctx.shadowColor = rank.colorMuted;
  ctx.shadowBlur = 28;
  roundRect(ctx, x, y, size, size, 18);
  ctx.strokeStyle = `${rank.color}88`;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawStatBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
  accent: string,
) {
  roundRect(ctx, x, y, w, h, 16);
  ctx.fillStyle = "rgba(15,23,42,0.78)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = "rgba(148,163,184,0.9)";
  ctx.font = "700 11px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText(label, x + 20, y + 32);

  ctx.fillStyle = accent;
  ctx.font = "800 44px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText(value, x + 18, y + h - 22);
}

function drawRankProgressBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  rank: ScoreCardPayload["rank"],
  accent: string,
) {
  const span =
    rank.levelInfo.maxXp != null ? rank.levelInfo.maxXp - rank.levelInfo.minXp + 1 : 100;
  const pct = Math.min(100, Math.round((rank.levelInfo.xpIntoLevel / span) * 100));

  roundRect(ctx, x, y, w, 10, 5);
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.fill();

  if (pct > 0) {
    roundRect(ctx, x, y, Math.max(10, (w * pct) / 100), 10, 5);
    const grad = ctx.createLinearGradient(x, 0, x + w, 0);
    grad.addColorStop(0, accent);
    grad.addColorStop(1, rank.color);
    ctx.fillStyle = grad;
    ctx.fill();
  }
}

function drawScoreCredentialCard(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  data: ScoreCardPayload,
  logo: HTMLImageElement | null,
  avatar: HTMLImageElement | null,
  rankIcon: HTMLImageElement | null,
) {
  const accent = accentForAccuracy(data.accuracy);
  const scoreDisplay =
    data.correct != null && data.total != null ? `${data.correct}/${data.total}` : "—";
  const accuracyDisplay = data.accuracy != null ? `${data.accuracy}%` : "—";
  const titleClean = data.title.length > 40 ? `${data.title.slice(0, 37)}…` : data.title;
  const rankTitle = normalizeRankTitle(data.rank.title);

  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#04080f");
  bg.addColorStop(1, "#0b1528");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const spot = ctx.createRadialGradient(380, 280, 20, 380, 280, 340);
  spot.addColorStop(0, accent.muted);
  spot.addColorStop(1, "transparent");
  ctx.fillStyle = spot;
  ctx.fillRect(0, 0, w, h);

  roundRect(ctx, 20, 20, w - 40, h - 40, 22);
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  ctx.stroke();

  if (logo) {
    ctx.drawImage(logo, 48, 44, 52, 52);
  }

  ctx.fillStyle = "#f8fafc";
  ctx.font = "800 32px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(titleClean, 112, 78);

  ctx.fillStyle = data.rank.labelOnDark;
  ctx.font = "700 14px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText(rankTitle.toUpperCase(), 112, 104);

  drawRankEmblem(ctx, w - 168, 48, 120, data.rank, rankIcon);

  const ringCx = 320;
  const ringCy = 310;
  const ringR = 118;
  drawProgressRing(
    ctx,
    ringCx,
    ringCy,
    ringR,
    18,
    data.accuracy ?? 0,
    accent.primary,
    "rgba(255,255,255,0.08)",
  );

  ctx.textAlign = "center";
  ctx.fillStyle = "#f8fafc";
  ctx.font = "800 72px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText(scoreDisplay, ringCx, ringCy + 8);

  ctx.fillStyle = accent.primary;
  ctx.font = "800 36px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText(accuracyDisplay, ringCx, ringCy + 52);
  ctx.textAlign = "left";

  const tileY = 468;
  const tileH = 108;
  const gap = 16;
  const tileW = (w - 96 - gap * 2) / 3;

  drawStatBlock(
    ctx,
    48,
    tileY,
    tileW,
    tileH,
    "CORRECT",
    data.correct != null ? String(data.correct) : "—",
    accent.primary,
  );
  drawStatBlock(ctx, 48 + tileW + gap, tileY, tileW, tileH, "ACCURACY", accuracyDisplay, accent.primary);
  drawStatBlock(ctx, 48 + (tileW + gap) * 2, tileY, tileW, tileH, "XP", `+${data.xp}`, data.rank.color);

  const metaX = 520;
  const metaY = 200;

  ctx.fillStyle = "#f1f5f9";
  ctx.font = "800 56px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText(accuracyDisplay, metaX, metaY);

  ctx.fillStyle = "rgba(148,163,184,0.95)";
  ctx.font = "600 13px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText("ACCURACY THIS RUN", metaX, metaY + 28);

  ctx.fillStyle = accent.primary;
  ctx.font = "800 48px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText(`+${data.xp}`, metaX, metaY + 88);

  ctx.fillStyle = "rgba(148,163,184,0.95)";
  ctx.font = "600 13px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText(data.isPreview ? "XP PREVIEW (SAME AS STUDENTS)" : "XP TOWARD GLOBAL RANK", metaX, metaY + 112);

  drawRankProgressBar(ctx, metaX, metaY + 136, w - metaX - 56, data.rank, accent.primary);

  if (data.nextRankLabel) {
    ctx.fillStyle = "rgba(203,213,225,0.85)";
    ctx.font = "600 13px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText(data.nextRankLabel, metaX, metaY + 168);
  }

  const footerY = h - 72;
  const avatarSize = 48;

  if (avatar) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(48 + avatarSize / 2, footerY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatar, 48, footerY, avatarSize, avatarSize);
    ctx.restore();
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(48 + avatarSize / 2, footerY + avatarSize / 2, avatarSize / 2 - 1, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(48 + avatarSize / 2, footerY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.fill();
    const initials = (data.playerName.match(/\b\w/g)?.slice(0, 2).join("") || "M").toUpperCase();
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "700 18px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(initials, 48 + avatarSize / 2, footerY + avatarSize / 2 + 6);
    ctx.textAlign = "left";
  }

  ctx.fillStyle = "#f8fafc";
  ctx.font = "700 20px system-ui, sans-serif";
  ctx.fillText(data.playerName.slice(0, 24), 108, footerY + 22);

  ctx.fillStyle = data.rank.labelOnDark;
  ctx.font = "600 13px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText(`${rankTitle} · ${data.dateLabel}`, 108, footerY + 44);

  ctx.fillStyle = "rgba(148,163,184,0.7)";
  ctx.font = "600 12px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textAlign = "right";
  ctx.fillText("mentrixa.one", w - 48, footerY + 32);
  ctx.textAlign = "left";
}

/** Client-side performance card → WebP download. */
export function ShareScoreCardButton({
  title,
  scoreLine,
  xpLine,
  playerName,
  playerAvatarUrl,
}: {
  title: string;
  scoreLine: string;
  xpLine: string;
  playerName?: string | null;
  playerAvatarUrl?: string | null;
}) {
  const [resolvedName, setResolvedName] = useState<string>("Mentrixer");
  const [resolvedAvatarUrl, setResolvedAvatarUrl] = useState<string | null>(
    playerAvatarUrl ?? null,
  );

  useEffect(() => {
    if (playerName && playerName.trim()) {
      setResolvedName(playerName.trim());
    }
    if (typeof playerAvatarUrl === "string") {
      setResolvedAvatarUrl(playerAvatarUrl.trim() || null);
    }
  }, [playerName, playerAvatarUrl]);

  useEffect(() => {
    let cancelled = false;
    if (playerName?.trim() && playerAvatarUrl !== undefined) return;

    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user || cancelled) return;

        const fallbackName =
          user.email?.split("@")[0]?.trim() || user.user_metadata?.full_name || "Mentrixer";

        const { data: settings } = await supabase
          .from("user_settings")
          .select("display_name, avatar_url")
          .eq("user_id", user.id)
          .maybeSingle();

        if (cancelled) return;

        const nextName =
          playerName?.trim() ||
          (typeof settings?.display_name === "string" && settings.display_name.trim()) ||
          String(fallbackName).trim() ||
          "Mentrixer";

        const nextAvatar =
          playerAvatarUrl ??
          (typeof settings?.avatar_url === "string" && settings.avatar_url.trim()
            ? settings.avatar_url.trim()
            : null);

        setResolvedName(nextName.slice(0, 26));
        setResolvedAvatarUrl(nextAvatar);
      } catch {
        // Best-effort profile enrichment for share cards.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [playerName, playerAvatarUrl]);

  const cardPayload = useMemo(
    () => parseScorePayload(title, scoreLine, xpLine, resolvedName),
    [title, scoreLine, xpLine, resolvedName],
  );

  const download = async () => {
    const w = 1200;
    const h = 630;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const [logoImg, avatarImg, rankIconImg] = await Promise.all([
      safeLoadImage(MENTRIXA_LOGO_PNG),
      resolvedAvatarUrl ? safeLoadImage(resolvedAvatarUrl) : Promise.resolve(null),
      safeLoadImage(cardPayload.rank.iconSrc),
    ]);

    drawScoreCredentialCard(ctx, w, h, cardPayload, logoImg, avatarImg, rankIconImg);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "mentrixa-performance-record.webp";
        a.click();
        URL.revokeObjectURL(url);
      },
      "image/webp",
      0.92,
    );
  };

  return (
    <button
      type="button"
      onClick={() => void download()}
      className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:border-cyan-300/50 hover:bg-white/15"
    >
      Download performance card
    </button>
  );
}
