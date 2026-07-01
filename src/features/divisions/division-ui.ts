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
  "ap-calculus-ab": {
    emoji: "∫",
    gradient: "from-violet-600 via-blue-600 to-indigo-500",
    softBg: "bg-violet-50",
    ring: "ring-violet-400/40",
  },
  mathematics: {
    emoji: "∑",
    gradient: "from-violet-600 via-blue-600 to-indigo-500",
    softBg: "bg-violet-50",
    ring: "ring-violet-400/40",
  },
  "computer-science": {
    emoji: "</>",
    gradient: "from-slate-800 via-blue-600 to-indigo-500",
    softBg: "bg-slate-50",
    ring: "ring-blue-400/40",
  },
  physics: {
    emoji: "⚛",
    gradient: "from-indigo-700 via-blue-600 to-sky-400",
    softBg: "bg-sky-50",
    ring: "ring-sky-400/40",
  },
  chemistry: {
    emoji: "🧪",
    gradient: "from-blue-700 via-indigo-500 to-violet-400",
    softBg: "bg-blue-50",
    ring: "ring-indigo-400/40",
  },
  biology: {
    emoji: "🧬",
    gradient: "from-indigo-700 via-blue-600 to-slate-400",
    softBg: "bg-indigo-50",
    ring: "ring-blue-400/40",
  },
  english: {
    emoji: "✎",
    gradient: "from-violet-700 via-blue-500 to-indigo-400",
    softBg: "bg-violet-50",
    ring: "ring-violet-400/40",
  },
  history: {
    emoji: "📜",
    gradient: "from-slate-800 via-slate-700 to-slate-600",
    softBg: "bg-slate-50",
    ring: "ring-slate-400/40",
  },
  economics: {
    emoji: "📈",
    gradient: "from-blue-900 via-blue-700 to-indigo-500",
    softBg: "bg-blue-50",
    ring: "ring-blue-400/40",
  },
  "data-science": {
    emoji: "◎",
    gradient: "from-purple-900 via-violet-600 to-blue-500",
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
    gradient: "from-blue-700 via-blue-600 to-indigo-500",
    softBg: "bg-blue-50",
    ring: "ring-blue-400/40",
  },
  {
    emoji: "◇",
    gradient: "from-violet-700 via-purple-600 to-indigo-500",
    softBg: "bg-violet-50",
    ring: "ring-violet-400/40",
  },
  {
    emoji: "○",
    gradient: "from-blue-800 via-blue-600 to-violet-500",
    softBg: "bg-blue-50",
    ring: "ring-blue-400/40",
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
