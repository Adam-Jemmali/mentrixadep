"use client";

import Link from "next/link";
import { practiceNodeHref } from "@/features/guidance/verdict-engine-pure";
import { SkillTreeEdge } from "@/features/skill-tree/skill-tree-edge";
import { SkillTreeNode } from "@/features/skill-tree/skill-tree-node";
import type {
  FrontierNodeView,
  SkillTreeData,
  SkillTreeNode as SkillTreeNodeData,
} from "@/features/skill-tree/types";
import { unitShortLabel } from "@/features/quest/ap-calc-unit-labels-pure";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";

function spread(count: number, start: number, end: number): number[] {
  if (count <= 1) return [(start + end) / 2];
  return Array.from(
    { length: count },
    (_, index) => start + ((end - start) * index) / (count - 1),
  );
}

function curve(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  horizontal: boolean,
): string {
  if (horizontal) {
    const midX = (fromX + toX) / 2;
    return `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`;
  }
  const midY = (fromY + toY) / 2;
  return `M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`;
}

function resolveNodes(
  views: FrontierNodeView[],
  nodesById: Map<string, SkillTreeNodeData>,
): SkillTreeNodeData[] {
  return views.flatMap((view) => {
    const node = nodesById.get(view.id);
    return node ? [node] : [];
  });
}

function DesktopFrontier({
  parents,
  focus,
  childNodes,
}: {
  parents: SkillTreeNodeData[];
  focus: SkillTreeNodeData;
  childNodes: SkillTreeNodeData[];
}) {
  const parentY = spread(parents.length, 80, 350);
  const childY = spread(childNodes.length, 80, 350);

  return (
    <div className="relative hidden h-[27rem] sm:block">
      <svg
        viewBox="0 0 900 430"
        className="pointer-events-none absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        aria-hidden
      >
        {parents.map((parent, index) => (
          <SkillTreeEdge
            key={`${parent.id}-${focus.id}`}
            path={curve(260, parentY[index] ?? 215, 385, 215, true)}
            active={parent.unlocked}
          />
        ))}
        {childNodes.map((child, index) => (
          <SkillTreeEdge
            key={`${focus.id}-${child.id}`}
            path={curve(515, 215, 640, childY[index] ?? 215, true)}
            active={child.unlocked}
          />
        ))}
      </svg>

      {parents.map((node, index) => (
        <div
          key={node.id}
          className="absolute left-[2%] w-[27%] max-w-56 -translate-y-1/2"
          style={{ top: `${((parentY[index] ?? 215) / 430) * 100}%` }}
        >
          <SkillTreeNode node={node} href={practiceNodeHref(node.nodeName)} />
        </div>
      ))}

      <div className="absolute left-1/2 top-1/2 w-[30%] max-w-64 -translate-x-1/2 -translate-y-1/2">
        <SkillTreeNode node={focus} isFocus />
        {focus.unlocked ? (
          <Link
            href={practiceNodeHref(focus.nodeName)}
            className="mt-4 flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#818CF8] bg-[#7C3AED] px-4 py-2 text-sm font-black text-white shadow-[2px_3px_0_#020617] transition-colors hover:bg-[#6D28D9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C4B5FD]"
          >
            <MentrixaVocabIcon name="quest" size={24} surface="dark" title="Open" />
            <span>Open</span>
          </Link>
        ) : null}
      </div>

      {childNodes.map((node, index) => (
        <div
          key={node.id}
          className="absolute right-[2%] w-[27%] max-w-56 -translate-y-1/2"
          style={{ top: `${((childY[index] ?? 215) / 430) * 100}%` }}
        >
          <SkillTreeNode
            node={node}
            href={node.unlocked ? practiceNodeHref(node.nodeName) : undefined}
          />
        </div>
      ))}
    </div>
  );
}

function MobileFrontier({
  parents,
  focus,
  childNodes,
}: {
  parents: SkillTreeNodeData[];
  focus: SkillTreeNodeData;
  childNodes: SkillTreeNodeData[];
}) {
  const parentX = spread(parents.length, 55, 305);
  const childX = spread(childNodes.length, 55, 305);

  return (
    <div className="relative min-h-[38rem] sm:hidden">
      <svg
        viewBox="0 0 360 620"
        className="pointer-events-none absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        aria-hidden
      >
        {parents.map((parent, index) => (
          <SkillTreeEdge
            key={`${parent.id}-${focus.id}`}
            path={curve(parentX[index] ?? 180, 98, 180, 230, false)}
            active={parent.unlocked}
          />
        ))}
        {childNodes.map((child, index) => (
          <SkillTreeEdge
            key={`${focus.id}-${child.id}`}
            path={curve(180, 365, childX[index] ?? 180, 500, false)}
            active={child.unlocked}
          />
        ))}
      </svg>

      <div className="absolute inset-x-0 top-0 grid grid-cols-2 gap-2">
        {parents.map((node) => (
          <SkillTreeNode
            key={node.id}
            node={node}
            compact
            href={practiceNodeHref(node.nodeName)}
          />
        ))}
      </div>

      <div className="absolute left-1/2 top-[13.5rem] w-[min(17rem,88%)] -translate-x-1/2">
        <SkillTreeNode node={focus} isFocus />
        {focus.unlocked ? (
          <Link
            href={practiceNodeHref(focus.nodeName)}
            className="mt-3 flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#818CF8] bg-[#7C3AED] px-4 py-2 font-black text-white shadow-[2px_3px_0_#020617] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C4B5FD]"
          >
            <MentrixaVocabIcon name="quest" size={24} surface="dark" title="Open" />
            <span>Open</span>
          </Link>
        ) : null}
      </div>

      <div className="absolute inset-x-0 bottom-0 grid grid-cols-2 gap-2">
        {childNodes.map((node) => (
          <SkillTreeNode
            key={node.id}
            node={node}
            compact
            href={node.unlocked ? practiceNodeHref(node.nodeName) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

export function SkillTreeCanvas({
  data,
  onOpenUnit,
}: {
  data: SkillTreeData;
  onOpenUnit: (unitNumber: number) => void;
}) {
  const nodesById = new Map(data.nodes.map((node) => [node.id, node]));
  const focus = nodesById.get(data.frontier.focus.id);
  const parents = resolveNodes(data.frontier.parents, nodesById);
  const children = resolveNodes(data.frontier.children, nodesById);

  if (!focus) {
    return (
      <section className="rounded-2xl border border-white/10 bg-[#0B1220] p-6 text-sm text-slate-300">
        No frontier is available. Open All skills next.
      </section>
    );
  }

  return (
    <section
      className="overflow-hidden rounded-3xl border border-[#334155] bg-[#0B1220] p-3 shadow-[0_18px_50px_rgba(15,23,42,0.24)] sm:p-5"
      aria-label="AP Calculus AB frontier"
    >
      <div className="-mx-1 overflow-x-auto px-1 pb-3">
        <div className="flex min-w-max gap-2">
          {data.grid.units.map((unit) => (
            <button
              key={unit.unitNumber}
              type="button"
              onClick={() => onOpenUnit(unit.unitNumber)}
              className="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border border-[#475569] bg-[#111C32] px-3 py-2 text-left text-white transition-colors hover:border-[#818CF8] hover:bg-[#17233B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A5B4FC]"
              title={`Unit ${unit.unitNumber}: ${unit.unitName}`}
            >
              <MentrixaVocabIcon name="unit" size={28} surface="dark" title="Unit" />
              <span className="max-w-32">
                <span className="block text-[9px] font-black uppercase tracking-[0.14em] text-violet-200">
                  Unit {unit.unitNumber}
                </span>
                <span className="block truncate text-xs font-semibold">
                  {unitShortLabel(unit.unitNumber)}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <DesktopFrontier parents={parents} focus={focus} childNodes={children} />
      <MobileFrontier parents={parents} focus={focus} childNodes={children} />
    </section>
  );
}
