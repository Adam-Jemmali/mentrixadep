/**
 * Visual identity per subject division — cards, headers, pickers.
 * Unknown keys fall back to a neutral theme (hash-stable accent).
 */

export type DivisionTheme = {
  emoji: string;
  /** Tailwind gradient classes (from / to) */
  gradient: string;
  /** Subtle background for selected state */
  softBg: string;
  ring: string;
};

const PRESET: Record<string, DivisionTheme> = {
  mathematics: {
    emoji: "∑",
    gradient: "from-violet-600 via-fuchsia-600 to-pink-500",
    softBg: "bg-violet-50",
    ring: "ring-violet-400/40",
  },
  "computer-science": {
    emoji: "</>",
    gradient: "from-slate-800 via-cyan-600 to-emerald-500",
    softBg: "bg-slate-50",
    ring: "ring-cyan-400/40",
  },
  physics: {
    emoji: "⚛",
    gradient: "from-indigo-700 via-blue-600 to-sky-400",
    softBg: "bg-sky-50",
    ring: "ring-sky-400/40",
  },
  chemistry: {
    emoji: "🧪",
    gradient: "from-emerald-700 via-teal-500 to-lime-400",
    softBg: "bg-emerald-50",
    ring: "ring-teal-400/40",
  },
  biology: {
    emoji: "🧬",
    gradient: "from-green-700 via-lime-600 to-yellow-400",
    softBg: "bg-lime-50",
    ring: "ring-lime-400/40",
  },
  english: {
    emoji: "✎",
    gradient: "from-rose-700 via-orange-500 to-amber-400",
    softBg: "bg-rose-50",
    ring: "ring-rose-400/40",
  },
  history: {
    emoji: "📜",
    gradient: "from-amber-900 via-amber-700 to-yellow-600",
    softBg: "bg-amber-50",
    ring: "ring-amber-400/40",
  },
  economics: {
    emoji: "📈",
    gradient: "from-blue-900 via-blue-700 to-cyan-500",
    softBg: "bg-blue-50",
    ring: "ring-blue-400/40",
  },
  "data-science": {
    emoji: "◎",
    gradient: "from-purple-900 via-violet-600 to-fuchsia-500",
    softBg: "bg-purple-50",
    ring: "ring-purple-400/40",
  },
  general: {
    emoji: "✦",
    gradient: "from-slate-600 via-slate-500 to-zinc-400",
    softBg: "bg-slate-50",
    ring: "ring-slate-400/40",
  },
};

const FALLBACK_ACCENTS: DivisionTheme[] = [
  {
    emoji: "◆",
    gradient: "from-mentrixa-700 via-mentrixa-600 to-cyan-500",
    softBg: "bg-mentrixa-50",
    ring: "ring-mentrixa-400/40",
  },
  {
    emoji: "◇",
    gradient: "from-fuchsia-700 via-purple-600 to-indigo-500",
    softBg: "bg-fuchsia-50",
    ring: "ring-fuchsia-400/40",
  },
  {
    emoji: "○",
    gradient: "from-teal-700 via-cyan-600 to-blue-500",
    softBg: "bg-teal-50",
    ring: "ring-teal-400/40",
  },
];

function hashKey(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (h << 5) - h + key.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function getDivisionTheme(divisionKey: string): DivisionTheme {
  const preset = PRESET[divisionKey];
  if (preset) return preset;
  const picked =
    FALLBACK_ACCENTS[hashKey(divisionKey) % FALLBACK_ACCENTS.length] ?? FALLBACK_ACCENTS[0];
  if (picked) return picked;
  return PRESET.general as DivisionTheme;
}

/** One-line teaser from DB description */
export function divisionTeaser(description: string | null, name: string): string {
  if (description?.trim()) {
    const t = description.trim();
    return t.length > 96 ? `${t.slice(0, 93)}…` : t;
  }
  return `Compete, learn, and book sessions in ${name.replace(/\s+Division$/i, "")}.`;
}
