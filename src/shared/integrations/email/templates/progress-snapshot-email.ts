import { escapeHtml, APP_URL, EMAIL_ASSET_ORIGIN } from "../shared";
import { ctaButton } from "../templates";
import type { ProgressSnapshotData } from "@/features/progress-snapshot/types";
import type { Verdict } from "@/features/guidance/verdict-engine-pure";
import { normalizeRankTitle } from "@/features/xp/rank-icons";

export type ProgressSnapshotEmailTemplateProps = {
  snapshot: ProgressSnapshotData;
  weeklyVerdict?: Verdict | null;
};

function rankBadgeImg(title: string): string {
  const key = normalizeRankTitle(title).toLowerCase();
  const file = key === "mentrixer" ? "mentrixer-rank.svg" : `${key}.svg`;
  return `${EMAIL_ASSET_ORIGIN}/icons/${file}`;
}

function signedDelta(n: number): string {
  if (n > 0) return `+${n}`;
  if (n < 0) return `${n}`;
  return "0";
}

function verdictBlock(verdict: Verdict): string {
  const href = verdict.nextAction.href.startsWith("http")
    ? verdict.nextAction.href
    : `${APP_URL}${verdict.nextAction.href}`;
  return `<div style="margin:0 0 20px;padding:16px 18px;border:1px solid #333;border-radius:12px;background:#141414;">
      <p style="margin:0 0 10px;color:#f5f5f5;font-size:16px;line-height:1.55;font-weight:600;">${escapeHtml(verdict.changed)}</p>
      <p style="margin:0 0 12px;color:#a3a3a3;font-size:14px;line-height:1.6;">${escapeHtml(verdict.reason)}</p>
      <p style="margin:0;"><a href="${escapeHtml(href)}" style="color:#a78bfa;font-size:14px;font-weight:600;text-decoration:none;">${escapeHtml(verdict.nextAction.label)} →</a></p>
    </div>`;
}

export function progressSnapshotEmailSubject(props: ProgressSnapshotEmailTemplateProps): string {
  const hi = props.snapshot.firstName;
  const direction = props.snapshot.rankChange.direction;
  const subjectRank =
    direction === "up"
      ? "your rank moved up this week"
      : direction === "down"
        ? "your rank moved down this week"
        : "your weekly progress snapshot";
  return `${hi} — ${subjectRank}`;
}

export function progressSnapshotEmailTitle(props: ProgressSnapshotEmailTemplateProps): string {
  return `Your week in ${props.snapshot.subject}`;
}

export function progressSnapshotEmailBody(props: ProgressSnapshotEmailTemplateProps): string {
  const s = props.snapshot;
  const hi = s.firstName;
  const verdict = props.weeklyVerdict;
  const prev = normalizeRankTitle(s.rankChange.previous.title);
  const cur = normalizeRankTitle(s.rankChange.current.title);
  const rankArrow =
    s.rankChange.direction === "up" ? "↑" : s.rankChange.direction === "down" ? "↓" : "→";
  const divDelta = s.divisionRank.delta;
  const divPhrase =
    divDelta > 0
      ? `up from #${s.divisionRank.previous}`
      : divDelta < 0
        ? `down from #${s.divisionRank.previous}`
        : `held at #${s.divisionRank.current}`;

  return `<p style="color:#b4b4b4;font-size:15px;line-height:1.65;margin:0 0 16px;">Hi <strong style="color:#eee;">${escapeHtml(hi)}</strong>,</p>
    ${verdict ? verdictBlock(verdict) : ""}
    <p style="color:#737373;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;margin:0 0 8px;">Supporting detail</p>
    <p style="color:#737373;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;margin:0 0 8px;">Your week in ${escapeHtml(s.subject)}</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 16px;border-collapse:collapse;">
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #222;color:#888;font-size:13px;width:140px;">Rank</td>
        <td style="padding:12px 0;border-bottom:1px solid #222;color:#f5f5f5;font-size:14px;">
          <img src="${rankBadgeImg(s.rankChange.previous.title)}" alt="" width="28" height="28" style="vertical-align:middle;margin-right:6px;" />
          ${escapeHtml(prev)} ${rankArrow}
          <img src="${rankBadgeImg(s.rankChange.current.title)}" alt="" width="28" height="28" style="vertical-align:middle;margin:0 6px;" />
          <strong>${escapeHtml(cur)}</strong>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #222;color:#888;font-size:13px;">Quest accuracy</td>
        <td style="padding:12px 0;border-bottom:1px solid #222;color:#f5f5f5;font-size:14px;">${s.accuracyThisWeek}% (${signedDelta(s.accuracyDelta)}% vs last week)</td>
      </tr>
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #222;color:#888;font-size:13px;">Duels</td>
        <td style="padding:12px 0;border-bottom:1px solid #222;color:#f5f5f5;font-size:14px;">${s.duelsWon} won, ${s.duelsLost} lost</td>
      </tr>
      <tr>
        <td style="padding:12px 0;color:#888;font-size:13px;">Division rank</td>
        <td style="padding:12px 0;color:#f5f5f5;font-size:14px;">#${s.divisionRank.current} (${divPhrase})</td>
      </tr>
    </table>
    ${ctaButton(s.bookingCtaUrl, `Book ${s.recommendedGuide.displayName} — $39`)}
    <p style="margin:20px 0 0;color:#525252;font-size:12px;line-height:1.55;text-align:center;">Free to compete. You only pay when you book.</p>`;
}
