/** Public arena / guide embed feed shapes. Brief copy only. */

export const PUBLIC_ARENA_FEED_LIMIT = 10;
export const PUBLIC_FEED_CACHE_CONTROL = "public, max-age=30";
export const PUBLIC_FEED_RATE_MAX = 60;
export const PUBLIC_FEED_RATE_WINDOW_MS = 60_000;

export type PublicFeedItem = {
  id: string;
  event_type: string;
  display_name: string;
  node_name: string;
  unit_name: string;
  accuracy_pct: number | null;
  occurred_at: string;
};

export type PublicFeedResponse = {
  items: PublicFeedItem[];
  generated_at: string;
};

export function toPublicFeedItem(row: {
  id: string;
  event_type: string;
  display_name: string;
  node_name: string;
  unit_name: string;
  accuracy_pct: number | null;
  occurred_at: string;
}): PublicFeedItem {
  return {
    id: row.id,
    event_type: row.event_type,
    display_name: row.display_name.trim() || "Mentrixer",
    node_name: row.node_name.trim() || "Skill",
    unit_name: row.unit_name.trim() || "",
    accuracy_pct: row.accuracy_pct,
    occurred_at: row.occurred_at,
  };
}

export function portfolioToPublicFeedItem(row: {
  id: string;
  nodeName: string;
  beforeAccuracy: number;
  afterAccuracy: number;
  addedAt: string;
}): PublicFeedItem {
  const before = Math.round(row.beforeAccuracy);
  const after = Math.round(row.afterAccuracy);
  return {
    id: row.id,
    event_type: "guide_breakthrough",
    display_name: `${row.nodeName} lift`,
    node_name: row.nodeName.trim() || "Skill",
    unit_name: `${before}% to ${after}%`,
    accuracy_pct: after,
    occurred_at: row.addedAt,
  };
}

export function formatPublicFeedLine(item: PublicFeedItem): string {
  if (item.event_type === "guide_breakthrough") {
    return `${item.node_name} ${item.unit_name}`.trim();
  }
  if (item.event_type === "division_war_result") {
    return item.display_name;
  }
  if (item.event_type === "rank_advance") {
    return item.display_name;
  }
  if (item.accuracy_pct === 100) {
    return `${item.display_name} locked ${item.node_name}`;
  }
  if (item.accuracy_pct === 0) {
    return `${item.display_name} missed ${item.node_name}`;
  }
  return `${item.display_name} · ${item.node_name}`;
}

export function parseWidgetTheme(raw: string | null | undefined): "dark" | "light" {
  return raw === "light" ? "light" : "dark";
}

export function parseWidgetHeight(raw: string | null | undefined, fallback = 420): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(240, Math.min(900, Math.round(n)));
}

export function buildArenaWidgetIframeHtml(params: {
  siteUrl: string;
  theme: "dark" | "light";
  height: number;
}): string {
  const src = `${params.siteUrl.replace(/\/$/, "")}/widget/arena?theme=${params.theme}&height=${params.height}`;
  return `<iframe src="${src}" title="Mentrixa Arena" width="100%" height="${params.height}" style="border:0;border-radius:12px;overflow:hidden;" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}
