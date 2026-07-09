import { parseStepTraceSequence } from "../../src/features/diagnostics/step-trace-types";

export const MIN_STEP_TRACE_SEED_COUNT = 15;
export const STEP_TRACE_SEED_UNITS = [1, 2, 3] as const;

export type StepTraceSeedEntry = {
  seed_id: string;
  node_slug: string;
  prompt: string;
  step_sequence: unknown;
};

export type SkillNodeRef = {
  id: string;
  node_slug: string;
  unit_number: number;
};

export type ApprovedItemRef = {
  id: string;
  skill_node_id: string;
  step_sequence: unknown | null;
};

export type SeedAssignment = {
  seed_id: string;
  node_slug: string;
  item_id: string;
  prompt: string;
  step_sequence: unknown;
};

export function loadStepTraceSeedEntries(raw: unknown): StepTraceSeedEntry[] {
  if (!Array.isArray(raw)) {
    throw new Error("Step trace seed file must be a JSON array.");
  }

  const entries: StepTraceSeedEntry[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") {
      throw new Error("Each step trace seed entry must be an object.");
    }
    const entry = row as StepTraceSeedEntry;
    if (!entry.seed_id?.trim() || !entry.node_slug?.trim() || !entry.prompt?.trim()) {
      throw new Error("Each step trace seed entry requires seed_id, node_slug, and prompt.");
    }
    if (!parseStepTraceSequence(entry.step_sequence)) {
      throw new Error(`Invalid step_sequence for seed ${entry.seed_id}.`);
    }
    entries.push(entry);
  }

  if (entries.length < MIN_STEP_TRACE_SEED_COUNT) {
    throw new Error(
      `Expected at least ${MIN_STEP_TRACE_SEED_COUNT} step trace seed entries, got ${entries.length}.`,
    );
  }

  const seedIds = new Set<string>();
  for (const entry of entries) {
    if (seedIds.has(entry.seed_id)) {
      throw new Error(`Duplicate seed_id: ${entry.seed_id}`);
    }
    seedIds.add(entry.seed_id);
  }

  return entries;
}

export function assertSeedNodesInUnits(
  entries: StepTraceSeedEntry[],
  nodesBySlug: Map<string, SkillNodeRef>,
): void {
  for (const entry of entries) {
    const node = nodesBySlug.get(entry.node_slug);
    if (!node) {
      throw new Error(`Unknown node_slug in seed file: ${entry.node_slug}`);
    }
    if (!STEP_TRACE_SEED_UNITS.includes(node.unit_number as 1 | 2 | 3)) {
      throw new Error(
        `Seed ${entry.seed_id} targets unit ${node.unit_number}; only units 1-3 are allowed.`,
      );
    }
  }
}

export function assignStepTraceSeeds(
  entries: StepTraceSeedEntry[],
  nodesBySlug: Map<string, SkillNodeRef>,
  items: ApprovedItemRef[],
  force: boolean,
): { assignments: SeedAssignment[]; skipped: string[]; missing: string[] } {
  const itemsByNode = new Map<string, ApprovedItemRef[]>();
  for (const item of items) {
    const list = itemsByNode.get(item.skill_node_id) ?? [];
    list.push(item);
    itemsByNode.set(item.skill_node_id, list);
  }

  const usedItemIds = new Set<string>();
  const assignments: SeedAssignment[] = [];
  const skipped: string[] = [];
  const missing: string[] = [];

  for (const entry of entries) {
    const node = nodesBySlug.get(entry.node_slug);
    if (!node) {
      missing.push(`${entry.seed_id}: missing node ${entry.node_slug}`);
      continue;
    }

    const pool = (itemsByNode.get(node.id) ?? []).filter((item) => {
      if (usedItemIds.has(item.id)) return false;
      if (!force && item.step_sequence !== null && item.step_sequence !== undefined) {
        return false;
      }
      return true;
    });

    const item = pool[0];
    if (!item) {
      missing.push(`${entry.seed_id}: no available approved item on ${entry.node_slug}`);
      continue;
    }

    if (!force && item.step_sequence !== null && item.step_sequence !== undefined) {
      skipped.push(`${entry.seed_id}: already seeded on ${item.id}`);
      continue;
    }

    usedItemIds.add(item.id);
    assignments.push({
      seed_id: entry.seed_id,
      node_slug: entry.node_slug,
      item_id: item.id,
      prompt: entry.prompt,
      step_sequence: entry.step_sequence,
    });
  }

  return { assignments, skipped, missing };
}
