"use client";

import { useMemo, useState } from "react";
import { buildArenaWidgetIframeHtml } from "@/features/arena-widget/public-feed-pure";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/core/utils";

const HEIGHT = 420;

export function ArenaEmbedPageClient({ siteUrl }: { siteUrl: string }) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [copied, setCopied] = useState(false);

  const iframeHtml = useMemo(
    () =>
      buildArenaWidgetIframeHtml({
        siteUrl,
        theme,
        height: HEIGHT,
      }),
    [siteUrl, theme],
  );

  const previewSrc = `${siteUrl.replace(/\/$/, "")}/widget/arena?theme=${theme}&height=${HEIGHT}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-white">Arena widget</h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300">
        Embed the live AP Calculus AB feed. No login. Attribution stays in the frame.
      </p>

      <div className="mt-8 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          className={cn(
            "h-8 text-xs font-bold",
            theme === "dark" ? "bg-[var(--mx-violet)] text-white" : "bg-white/10 text-slate-200",
          )}
          onClick={() => setTheme("dark")}
        >
          Dark
        </Button>
        <Button
          type="button"
          size="sm"
          className={cn(
            "h-8 text-xs font-bold",
            theme === "light" ? "bg-[var(--mx-violet)] text-white" : "bg-white/10 text-slate-200",
          )}
          onClick={() => setTheme("light")}
        >
          Light
        </Button>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-indigo-400/30 bg-[var(--mx-navy)]">
        <iframe
          key={previewSrc}
          src={previewSrc}
          title="Arena widget preview"
          width="100%"
          height={HEIGHT}
          className="block w-full border-0"
          loading="lazy"
        />
      </div>

      <div className="mt-8">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#A5B4FC]">
            Copy HTML
          </p>
          <Button
            type="button"
            size="sm"
            className="h-8 bg-[var(--mx-violet)] text-xs font-bold text-white hover:bg-[var(--mx-primary-hover)]"
            onClick={async () => {
              await navigator.clipboard.writeText(iframeHtml);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1600);
            }}
          >
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <pre className="overflow-x-auto rounded-xl border border-indigo-400/20 bg-[#070d1a] p-4 text-xs leading-relaxed text-slate-200">
          {iframeHtml}
        </pre>
      </div>
    </div>
  );
}
