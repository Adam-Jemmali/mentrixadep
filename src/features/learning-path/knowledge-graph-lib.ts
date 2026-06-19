/**
 * Knowledge Graph — types, mastery algorithm, and display helpers.
 * Safe to import in both server and client code (no DB calls here).
 */

// ─── Core types ───────────────────────────────────────────────────────────────

export interface KnowledgeNode {
  id: string;
  userId: string;
  subject: string;
  topic: string;
  subtopic: string;
  skillNodeId?: string | null;
  masteryScore: number; // 0–100
  attempts: number;
  correct: number;
  correctStreak: number;
  firstAttemptCorrect?: boolean | null;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeNodeUpdate {
  subject: string;
  topic: string;
  subtopic: string;
  correct: boolean;
  skillNodeId?: string;
}

/** Flat subject → topic → subtopic tree for display */
export interface SubtopicEntry {
  subtopic: string;
  masteryScore: number;
  attempts: number;
  correct: number;
  lastSeenAt: string | null;
  status: MasteryStatus;
}

export interface TopicEntry {
  topic: string;
  subtopics: SubtopicEntry[];
  avgMastery: number;
  status: MasteryStatus;
}

export interface SubjectEntry {
  subject: string;
  topics: TopicEntry[];
  avgMastery: number;
  totalSubtopics: number;
  masteredSubtopics: number;
  status: MasteryStatus;
}

export type MasteryStatus = "locked" | "learning" | "proficient" | "mastered";

export interface AdaptiveContext {
  /** Subject → topic → subtopic: mastery (0-100) */
  knowledgeMap: Record<string, Record<string, Record<string, number>>>;
  /** Subtopics with mastery < 50, sorted weakest first */
  weakSubtopics: { subject: string; topic: string; subtopic: string; mastery: number }[];
  /** Recently reinforced (mastery 70-89): avoid over-drilling */
  recentWins: { subject: string; topic: string; subtopic: string; mastery: number }[];
  /** Fully mastered (mastery ≥ 90) */
  masteredSubtopics: { subject: string; topic: string; subtopic: string }[];
}

// ─── Mastery algorithm ────────────────────────────────────────────────────────

/**
 * ELO-inspired mastery update.
 *
 * Correct answer:
 *   - Base gain: 8–15 pts depending on current mastery (diminishing returns at top)
 *   - Streak bonus: +3 per consecutive correct up to +15
 *
 * Incorrect answer:
 *   - Base loss: 5–12 pts (less punishing at low mastery so learners aren't demoralised)
 *   - Breaks streak
 *
 * Score is clamped to [0, 100].
 */
export function computeMasteryDelta(
  currentScore: number,
  correct: boolean,
  currentStreak: number
): { newScore: number; newStreak: number; delta: number } {
  const clamped = Math.max(0, Math.min(100, currentScore));

  if (correct) {
    // Diminishing returns: gain less when already proficient
    const baseGain = clamped < 30 ? 15 : clamped < 60 ? 12 : clamped < 80 ? 9 : 6;
    const streakBonus = Math.min(currentStreak * 3, 15);
    const delta = baseGain + streakBonus;
    const newScore = Math.min(100, clamped + delta);
    return { newScore, newStreak: currentStreak + 1, delta };
  } else {
    // Less punishing near zero
    const baseLoss = clamped < 20 ? 3 : clamped < 50 ? 6 : clamped < 80 ? 10 : 12;
    const delta = -baseLoss;
    const newScore = Math.max(0, clamped + delta);
    return { newScore, newStreak: 0, delta };
  }
}

// ─── Status classification ────────────────────────────────────────────────────

export function masteryStatusFromScore(score: number): MasteryStatus {
  if (score === 0) return "locked";
  if (score < 40) return "learning";
  if (score < 80) return "proficient";
  return "mastered";
}

export function masteryStatusLabel(status: MasteryStatus): string {
  switch (status) {
    case "locked": return "Not started";
    case "learning": return "Learning";
    case "proficient": return "Proficient";
    case "mastered": return "Mastered";
  }
}

export function masteryStatusColor(status: MasteryStatus): string {
  switch (status) {
    case "locked": return "text-slate-400";
    case "learning": return "text-amber-600";
    case "proficient": return "text-blue-600";
    case "mastered": return "text-emerald-600";
  }
}

export function masteryBarColor(status: MasteryStatus): string {
  switch (status) {
    case "locked": return "bg-slate-200";
    case "learning": return "bg-amber-400";
    case "proficient": return "bg-blue-500";
    case "mastered": return "bg-emerald-500";
  }
}

// ─── Tree builder ─────────────────────────────────────────────────────────────

/** Convert flat KnowledgeNode[] into hierarchical SubjectEntry[] for display. */
export function buildKnowledgeTree(nodes: KnowledgeNode[]): SubjectEntry[] {
  const subjectMap = new Map<string, Map<string, SubtopicEntry[]>>();

  for (const node of nodes) {
    if (!subjectMap.has(node.subject)) {
      subjectMap.set(node.subject, new Map());
    }
    const topicMap = subjectMap.get(node.subject)!;
    if (!topicMap.has(node.topic)) {
      topicMap.set(node.topic, []);
    }
    const subtopicEntry: SubtopicEntry = {
      subtopic: node.subtopic,
      masteryScore: node.masteryScore,
      attempts: node.attempts,
      correct: node.correct,
      lastSeenAt: node.lastSeenAt,
      status: masteryStatusFromScore(node.masteryScore),
    };
    topicMap.get(node.topic)!.push(subtopicEntry);
  }

  const subjects: SubjectEntry[] = [];

  for (const [subject, topicMap] of subjectMap) {
    const topics: TopicEntry[] = [];

    for (const [topic, subtopics] of topicMap) {
      const sorted = subtopics.sort((a: SubtopicEntry, b: SubtopicEntry) => a.subtopic.localeCompare(b.subtopic));
      const avg = sorted.length > 0
        ? Math.round(sorted.reduce((s: number, st: SubtopicEntry) => s + st.masteryScore, 0) / sorted.length)
        : 0;
      topics.push({
        topic,
        subtopics: sorted,
        avgMastery: avg,
        status: masteryStatusFromScore(avg),
      });
    }

    const sortedTopics = topics.sort((a, b) => a.topic.localeCompare(b.topic));
    const allSubtopics = sortedTopics.flatMap((t) => t.subtopics);
    const subjectAvg = allSubtopics.length > 0
      ? Math.round(allSubtopics.reduce((s, st) => s + st.masteryScore, 0) / allSubtopics.length)
      : 0;
    const mastered = allSubtopics.filter((st) => st.status === "mastered").length;

    subjects.push({
      subject,
      topics: sortedTopics,
      avgMastery: subjectAvg,
      totalSubtopics: allSubtopics.length,
      masteredSubtopics: mastered,
      status: masteryStatusFromScore(subjectAvg),
    });
  }

  return subjects.sort((a, b) => b.avgMastery - a.avgMastery);
}

// ─── Adaptive context builder ─────────────────────────────────────────────────

/** Build AdaptiveContext from flat nodes — used to prime the Gemini adaptive prompt. */
export function buildAdaptiveContext(nodes: KnowledgeNode[]): AdaptiveContext {
  const knowledgeMap: Record<string, Record<string, Record<string, number>>> = {};
  const weakSubtopics: AdaptiveContext["weakSubtopics"] = [];
  const recentWins: AdaptiveContext["recentWins"] = [];
  const masteredSubtopics: AdaptiveContext["masteredSubtopics"] = [];

  for (const node of nodes) {
    if (!knowledgeMap[node.subject]) knowledgeMap[node.subject] = {};
    if (!knowledgeMap[node.subject]![node.topic]) knowledgeMap[node.subject]![node.topic] = {};
    knowledgeMap[node.subject]![node.topic]![node.subtopic] = node.masteryScore;

    if (node.masteryScore < 50) {
      weakSubtopics.push({
        subject: node.subject,
        topic: node.topic,
        subtopic: node.subtopic,
        mastery: node.masteryScore,
      });
    } else if (node.masteryScore >= 70 && node.masteryScore < 90) {
      recentWins.push({
        subject: node.subject,
        topic: node.topic,
        subtopic: node.subtopic,
        mastery: node.masteryScore,
      });
    } else if (node.masteryScore >= 90) {
      masteredSubtopics.push({
        subject: node.subject,
        topic: node.topic,
        subtopic: node.subtopic,
      });
    }
  }

  weakSubtopics.sort((a, b) => a.mastery - b.mastery);

  return { knowledgeMap, weakSubtopics, recentWins, masteredSubtopics };
}

// ─── Estimated sessions to mastery ───────────────────────────────────────────

/**
 * Rough estimate of practice sessions to reach mastery (score ≥ 90).
 * Assumes ~5 questions per session, average gain of ~8 pts/correct,
 * and 65% correct rate.
 */
export function estimatedSessionsToMastery(currentScore: number): number {
  if (currentScore >= 90) return 0;
  const needed = 90 - currentScore;
  const avgGainPerSession = 5 * 0.65 * 8; // ~26 pts / session
  return Math.max(1, Math.ceil(needed / avgGainPerSession));
}

// ─── Recommended next steps ───────────────────────────────────────────────────

export interface NextStepRecommendation {
  subject: string;
  topic: string;
  subtopic: string;
  masteryScore: number;
  reason: "almost_mastered" | "new_territory";
  estimatedSessions: number;
}

/**
 * Produce up to 4 recommended next steps using a "pick-what-matters" heuristic:
 * 1. Weakest subtopic per subject (most urgent)
 * 2. Subtopics closest to mastery (momentum)
 * 3. Unexplored topics adjacent to known ones
 */
export function buildNextStepRecommendations(
  nodes: KnowledgeNode[]
): NextStepRecommendation[] {
  const recs: NextStepRecommendation[] = [];
  const seen = new Set<string>();

  const add = (node: KnowledgeNode, reason: NextStepRecommendation["reason"]) => {
    const key = `${node.subject}|${node.topic}|${node.subtopic}`;
    if (seen.has(key)) return;
    seen.add(key);
    recs.push({
      subject: node.subject,
      topic: node.topic,
      subtopic: node.subtopic,
      masteryScore: node.masteryScore,
      reason,
      estimatedSessions: estimatedSessionsToMastery(node.masteryScore),
    });
  };

  // 1. Almost mastered (60-89 range, closest to 90)
  const almostMastered = nodes
    .filter((n) => n.masteryScore >= 60 && n.masteryScore < 90)
    .sort((a, b) => b.masteryScore - a.masteryScore);
  for (const n of almostMastered.slice(0, 2)) {
    add(n, "almost_mastered");
  }

  return recs.slice(0, 4);
}

/**
 * Subtopics downstream of a breakthrough concept in the same topic —
 * prefer unstarted / weak nodes the learner has not mastered yet.
 */
export function pickDownstreamSubtopics(
  nodes: KnowledgeNode[],
  subject: string,
  topic: string,
  brokenSubtopic: string,
  limit = 3,
): KnowledgeNode[] {
  const candidates = nodes.filter(
    (n) =>
      n.subject === subject &&
      n.topic === topic &&
      n.subtopic.toLowerCase() !== brokenSubtopic.toLowerCase() &&
      n.masteryScore < 80,
  );

  const unstarted = candidates
    .filter((n) => n.masteryScore === 0)
    .sort((a, b) => a.subtopic.localeCompare(b.subtopic));
  const weak = candidates
    .filter((n) => n.masteryScore > 0)
    .sort((a, b) => a.masteryScore - b.masteryScore);

  const ordered = [...unstarted, ...weak];
  const seen = new Set<string>();
  const picked: KnowledgeNode[] = [];
  for (const node of ordered) {
    const key = node.subtopic.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(node);
    if (picked.length >= limit) break;
  }
  return picked;
}
