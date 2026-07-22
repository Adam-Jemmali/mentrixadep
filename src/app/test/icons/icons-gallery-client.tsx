"use client";

import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import {
  CORE_VOCAB_ICON_NAMES,
  VOCAB_ICON_CATEGORIES,
  getVocabIconMeta,
  vocabIconsByCategory,
  type VocabIconCategory,
} from "@/shared/icons/mentrixa-vocab-map";

const CATEGORY_LABELS: Record<VocabIconCategory, string> = {
  nav: "Navigation & shell",
  core: "Core mechanics",
  social: "Social & competition",
  coaching: "Coaching & commerce",
  reports: "Reports & archives",
  profile: "Profile & share",
  "guide-rank": "Guide ranks",
  pricing: "Pricing tiers",
  landing: "Landing bento & flow",
};

function IconTile({ name }: { name: (typeof CORE_VOCAB_ICON_NAMES)[number] }) {
  const icon = getVocabIconMeta(name);
  return (
    <li className="flex flex-col items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-950/40 p-4 text-center">
      <MentrixaVocabIcon
        name={icon.name}
        size={40}
        gold={icon.allowsGold === true}
        className="text-slate-200"
      />
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-slate-100">{icon.label}</p>
        <p className="mt-0.5 truncate font-mono text-[10px] text-slate-500">{icon.name}</p>
        <p className="mt-0.5 truncate font-mono text-[9px] text-slate-600">{icon.src}</p>
      </div>
    </li>
  );
}

export function IconsGalleryClient() {
  return (
    <div className="space-y-12">
      <section>
        <h2 className="mb-1 text-lg font-bold text-white">Core 18 vocabulary</h2>
        <p className="mb-4 text-xs text-slate-400">
          Phase 2 atomic stickers in{" "}
          <span className="font-mono text-violet-300">public/icons/vocab/</span> |{" "}
          {CORE_VOCAB_ICON_NAMES.length} icons
        </p>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {CORE_VOCAB_ICON_NAMES.map((name) => (
            <IconTile key={name} name={name} />
          ))}
        </ul>
      </section>

      {VOCAB_ICON_CATEGORIES.map((category) => {
        const icons = vocabIconsByCategory(category);
        return (
          <section key={category}>
            <h2 className="mb-1 text-lg font-bold text-white">{CATEGORY_LABELS[category]}</h2>
            <p className="mb-4 text-xs text-slate-400">
              {icons.length} icon{icons.length === 1 ? "" : "s"}. dashed box = SVG not yet designed
            </p>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {icons.map((icon) => (
                <li
                  key={icon.name}
                  className="flex flex-col items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 p-4 text-center"
                >
                  <MentrixaVocabIcon
                    name={icon.name}
                    size={40}
                    gold={icon.allowsGold === true}
                    className="text-slate-200"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-100">{icon.label}</p>
                    <p className="mt-0.5 truncate font-mono text-[10px] text-slate-500">{icon.name}</p>
                    <p className="mt-0.5 truncate font-mono text-[9px] text-slate-600">{icon.src}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
