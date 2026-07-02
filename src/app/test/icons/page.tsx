import { IconsGalleryClient } from "./icons-gallery-client";
import {
  VOCAB_ICON_NAMES,
  VOCAB_ICON_REGISTRY,
} from "@/shared/icons/mentrixa-vocab-map";

export const metadata = {
  title: "Vocab icons · Mentrixa dev",
  robots: { index: false, follow: false },
};

export default function VocabIconsTestPage() {
  const goldCount = VOCAB_ICON_NAMES.filter(
    (name) => VOCAB_ICON_REGISTRY[name].allowsGold,
  ).length;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 border-b border-slate-800 pb-8">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400">
            Dev only
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-white">
            Mentrixa vocabulary icons
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
            Registry from <code className="text-violet-300">mentrixa-vocab-map.ts</code>. Placeholders
            appear until sticker SVGs land in{" "}
            <code className="text-violet-300">public/icons/vocab/</code> and{" "}
            <code className="text-violet-300">public/icons/guide-ranks/</code>. Student ranks
            Wanderer→Mentrixer stay in <code className="text-violet-300">public/icons/*.svg</code>{" "}
            and are not listed here.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {VOCAB_ICON_NAMES.length} registered · {goldCount} allow gold verified styling · Core 18
            at top
          </p>
        </header>

        <IconsGalleryClient />
      </div>
    </main>
  );
}
