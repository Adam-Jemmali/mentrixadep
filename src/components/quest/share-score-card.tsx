"use client";

/** Client-side OG-style score card → PNG download. */
export function ShareScoreCardButton({
  title,
  scoreLine,
  xpLine,
}: {
  title: string;
  scoreLine: string;
  xpLine: string;
}) {
  const download = () => {
    const w = 1200;
    const h = 630;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#0f172a");
    g.addColorStop(0.5, "#1e3a5f");
    g.addColorStop(1, "#0c4a6e");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.arc(w * 0.85, h * 0.15, 120, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 52px system-ui, sans-serif";
    ctx.fillText("Mentrixa Quest", 80, 120);

    ctx.font = "36px system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    const t = title.slice(0, 80);
    ctx.fillText(t, 80, 220);

    ctx.font = "44px system-ui, sans-serif";
    ctx.fillStyle = "#5eead4";
    ctx.fillText(scoreLine, 80, 340);

    ctx.font = "28px system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText(xpLine, 80, 420);

    ctx.font = "20px system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillText("mentrixa.one", 80, h - 60);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "mentrixa-quest-score.png";
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  return (
    <button
      type="button"
      onClick={download}
      className="text-sm font-medium text-mentrixa-600 hover:underline"
    >
      Share score (image)
    </button>
  );
}
