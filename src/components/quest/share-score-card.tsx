"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MENTRIXA_LOGO_PNG } from "@/lib/mentrixa-brand";

/** Client-side OG-style score card → WebP download. */
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

  const comebackCopy = useMemo(() => {
    const xp = Number.parseInt((xpLine.match(/[0-9,]+/)?.[0] ?? "0").replace(/,/g, ""), 10) || 0;
    if (xp >= 150) {
      return "Momentum unlocked. Share it, then defend your streak tomorrow.";
    }
    if (xp >= 80) {
      return "Strong run. Post it now and come back for an even cleaner score.";
    }
    return "Small wins stack fast. Share this run and jump back in for +XP.";
  }, [xpLine]);

  const download = async () => {
    const w = 1200;
    const h = 630;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const variant: "competitive" | "achievement" =
      Math.random() < 0.5 ? "competitive" : "achievement";

    const safeLoadImage = async (src: string): Promise<HTMLImageElement | null> => {
      return await new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
      });
    };

    const logoImg = await safeLoadImage(MENTRIXA_LOGO_PNG);
    const mentrixerImg = await safeLoadImage("/icons/mentrixer.svg");
    const avatar = resolvedAvatarUrl ? await safeLoadImage(resolvedAvatarUrl) : null;

    const drawAvatar = (x: number, y: number, size: number) => {
      if (avatar) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, x, y, size, size);
        ctx.restore();

        ctx.strokeStyle = "rgba(255,255,255,0.75)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2 - 1, 0, Math.PI * 2);
        ctx.stroke();
        return;
      }

      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
      ctx.fill();

      const initials = (resolvedName.match(/\b\w/g)?.slice(0, 2).join("") || "M").toUpperCase();
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "700 34px system-ui, sans-serif";
      ctx.fillText(initials, x + 25, y + 60);
    };

    if (variant === "competitive") {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#070f1e");
      g.addColorStop(0.45, "#12284a");
      g.addColorStop(1, "#0d4f75");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.beginPath();
      ctx.arc(w * 0.85, h * 0.15, 120, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(14, 165, 233, 0.15)";
      ctx.beginPath();
      ctx.arc(w * 0.18, h * 0.86, 180, 0, Math.PI * 2);
      ctx.fill();

      for (let i = 0; i < 5; i += 1) {
        const y = 130 + i * 34;
        ctx.strokeStyle = `rgba(148, 163, 184, ${0.12 - i * 0.015})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(640, y);
        ctx.bezierCurveTo(760, y - 26, 930, y + 24, 1130, y - 8);
        ctx.stroke();
      }

      if (logoImg) {
        ctx.globalAlpha = 0.98;
        ctx.drawImage(logoImg, 74, 48, 72, 72);
        ctx.globalAlpha = 1;
      }

      if (mentrixerImg) {
        ctx.globalAlpha = 0.95;
        ctx.drawImage(mentrixerImg, w - 180, 58, 94, 94);
        ctx.globalAlpha = 1;
      }

      drawAvatar(82, 470, 92);

      ctx.fillStyle = "#ffffff";
      ctx.font = "700 44px system-ui, sans-serif";
      ctx.fillText("Mentrixa Quest", 166, 96);

      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = "600 20px system-ui, sans-serif";
      ctx.fillText("Share the score. Return stronger.", 166, 126);

      ctx.font = "700 34px system-ui, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      const t = title.slice(0, 56);
      ctx.fillText(t, 82, 214);

      ctx.font = "800 56px system-ui, sans-serif";
      ctx.fillStyle = "#67e8f9";
      ctx.fillText(scoreLine, 82, 310);

      ctx.font = "700 32px system-ui, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillText(xpLine, 84, 366);

      ctx.fillStyle = "rgba(255,255,255,0.86)";
      ctx.font = "600 24px system-ui, sans-serif";
      ctx.fillText(comebackCopy.slice(0, 74), 84, 430);

      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = "700 26px system-ui, sans-serif";
      ctx.fillText(resolvedName.slice(0, 26), 192, 522);

      ctx.fillStyle = "rgba(196, 223, 255, 0.92)";
      ctx.font = "600 20px system-ui, sans-serif";
      ctx.fillText("Mentrixer", 192, 552);

      ctx.fillStyle = "rgba(224,242,254,0.9)";
      ctx.font = "700 18px system-ui, sans-serif";
      ctx.fillText("Next mission: Beat this score in your next run.", 84, h - 52);

      ctx.font = "600 18px system-ui, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillText("mentrixa.one", w - 200, h - 52);
    } else {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#1b114a");
      g.addColorStop(0.45, "#2b1f70");
      g.addColorStop(1, "#113353");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = "rgba(255,255,255,0.1)";
      for (let i = 0; i < 10; i += 1) {
        ctx.fillRect(40 + i * 120, 0, 2, h);
      }

      for (let i = 0; i < 6; i += 1) {
        ctx.strokeStyle = `rgba(186, 230, 253, ${0.12 - i * 0.01})`;
        ctx.lineWidth = 3 - i * 0.25;
        ctx.beginPath();
        ctx.moveTo(0, 110 + i * 56);
        ctx.quadraticCurveTo(410, 70 + i * 42, w, 120 + i * 48);
        ctx.stroke();
      }

      ctx.fillStyle = "rgba(103,232,249,0.15)";
      ctx.fillRect(62, 148, 420, 248);

      if (logoImg) {
        ctx.globalAlpha = 0.98;
        ctx.drawImage(logoImg, 74, 48, 70, 70);
        ctx.globalAlpha = 1;
      }

      if (mentrixerImg) {
        ctx.globalAlpha = 0.93;
        ctx.drawImage(mentrixerImg, w - 206, 50, 128, 128);
        ctx.globalAlpha = 1;
      }

      drawAvatar(74, 468, 96);

      ctx.fillStyle = "#ffffff";
      ctx.font = "700 42px system-ui, sans-serif";
      ctx.fillText("Mentrixa Quest", 160, 94);

      ctx.fillStyle = "rgba(226,232,240,0.95)";
      ctx.font = "600 20px system-ui, sans-serif";
      ctx.fillText("Progress worth posting !", 160, 124);

      ctx.fillStyle = "rgba(255,255,255,0.94)";
      ctx.font = "700 30px system-ui, sans-serif";
      ctx.fillText(title.slice(0, 58), 84, 208);

      ctx.fillStyle = "#a5f3fc";
      ctx.font = "800 60px system-ui, sans-serif";
      ctx.fillText(scoreLine, 84, 298);

      ctx.fillStyle = "rgba(224,242,254,0.98)";
      ctx.font = "700 34px system-ui, sans-serif";
      ctx.fillText(xpLine, 84, 352);

      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = "600 24px system-ui, sans-serif";
      ctx.fillText(comebackCopy.slice(0, 72), 84, 416);

      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.font = "700 28px system-ui, sans-serif";
      ctx.fillText(resolvedName.slice(0, 26), 190, 523);

      ctx.fillStyle = "rgba(191, 219, 254, 0.96)";
      ctx.font = "600 20px system-ui, sans-serif";
      ctx.fillText("Mentrixer", 190, 554);

      ctx.fillStyle = "rgba(125,211,252,0.96)";
      ctx.font = "700 20px system-ui, sans-serif";
      ctx.fillText("Replay now. Keep your edge. You proved what you know!", 84, h - 52);

      ctx.font = "600 18px system-ui, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.62)";
      ctx.fillText("mentrixa.one", w - 200, h - 52);
    }

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "mentrixa-quest-score.webp";
      a.click();
      URL.revokeObjectURL(url);
    }, "image/webp");
  };

  return (
    <button
      type="button"
      onClick={() => void download()}
      className="inline-flex items-center rounded-full border border-mentrixa-200 bg-white px-3.5 py-2 text-sm font-semibold text-mentrixa-700 transition hover:border-mentrixa-400 hover:bg-mentrixa-50"
    >
      Share score image
    </button>
  );
}
