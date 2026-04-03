"use client";

/**
 * SkillTree — SVG canvas rendering subject → topic → subtopic nodes.
 *
 * Layout: radial force-directed-style but computed statically (no physics lib needed).
 * - Centre nodes = subjects (large circles)
 * - Mid ring = topics (medium circles)
 * - Outer ring = subtopics (small circles)
 *
 * Colour coding:
 *   locked    = slate-200
 *   learning  = amber-400
 *   proficient = blue-500
 *   mastered  = emerald-500
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { gsap } from "gsap";
import type { SubjectEntry, MasteryStatus } from "@/lib/knowledge-graph";
import { masteryStatusFromScore } from "@/lib/knowledge-graph";

// ─── Colour map ───────────────────────────────────────────────────────────────

const STATUS_FILL: Record<MasteryStatus, string> = {
  locked: "#e2e8f0",
  learning: "#fbbf24",
  proficient: "#3b82f6",
  mastered: "#10b981",
};

const STATUS_STROKE: Record<MasteryStatus, string> = {
  locked: "#cbd5e1",
  learning: "#f59e0b",
  proficient: "#2563eb",
  mastered: "#059669",
};

// ─── Layout helpers ───────────────────────────────────────────────────────────

interface NodeData {
  id: string;
  label: string;
  x: number;
  y: number;
  r: number;
  status: MasteryStatus;
  mastery: number;
  kind: "subject" | "topic" | "subtopic";
  subject: string;
  topic?: string;
}

interface EdgeData {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  id: string;
}

function buildLayout(
  tree: SubjectEntry[],
  width: number,
  height: number
): { nodes: NodeData[]; edges: EdgeData[] } {
  const nodes: NodeData[] = [];
  const edges: EdgeData[] = [];
  const cx = width / 2;
  const cy = height / 2;

  const subjectCount = tree.length;
  if (subjectCount === 0) return { nodes, edges };

  // Radii for each ring
  const subjectR = 20;
  const topicR = 12;
  const subtopicR = 7;

  const subjectRingR = subjectCount === 1 ? 0 : Math.min(width, height) * 0.17;
  const topicRingR = Math.min(width, height) * 0.32;
  const subtopicRingR = Math.min(width, height) * 0.44;

  tree.forEach((subject, si) => {
    const sAngle = subjectCount === 1
      ? -Math.PI / 2
      : (2 * Math.PI * si) / subjectCount - Math.PI / 2;

    const sx = cx + subjectRingR * Math.cos(sAngle);
    const sy = cy + subjectRingR * Math.sin(sAngle);
    const subjectStatus = masteryStatusFromScore(subject.avgMastery);

    nodes.push({
      id: `s-${subject.subject}`,
      label: subject.subject,
      x: sx,
      y: sy,
      r: subjectR,
      status: subjectStatus,
      mastery: subject.avgMastery,
      kind: "subject",
      subject: subject.subject,
    });

    const topicCount = subject.topics.length;
    const arcSpan = subjectCount === 1 ? 2 * Math.PI : (2 * Math.PI) / subjectCount;
    const topicStart = sAngle - arcSpan * 0.38;

    subject.topics.forEach((topic, ti) => {
      const tAngle = topicCount === 1
        ? sAngle
        : topicStart + (arcSpan * 0.76 * ti) / Math.max(1, topicCount - 1);

      const tx = cx + topicRingR * Math.cos(tAngle);
      const ty = cy + topicRingR * Math.sin(tAngle);
      const topicStatus = masteryStatusFromScore(topic.avgMastery);
      const topicId = `t-${subject.subject}-${topic.topic}`;

      nodes.push({
        id: topicId,
        label: topic.topic,
        x: tx,
        y: ty,
        r: topicR,
        status: topicStatus,
        mastery: topic.avgMastery,
        kind: "topic",
        subject: subject.subject,
        topic: topic.topic,
      });

      edges.push({
        id: `e-s-${si}-t-${ti}`,
        x1: sx, y1: sy, x2: tx, y2: ty,
      });

      const subtopicCount = topic.subtopics.length;
      const subArcSpan = arcSpan * 0.55;
      const subStart = tAngle - subArcSpan / 2;

      topic.subtopics.slice(0, 8).forEach((subtopic, sti) => {
        const stAngle = subtopicCount === 1
          ? tAngle
          : subStart + (subArcSpan * sti) / Math.max(1, subtopicCount - 1);

        const stx = cx + subtopicRingR * Math.cos(stAngle);
        const sty = cy + subtopicRingR * Math.sin(stAngle);
        const subtopicId = `st-${subject.subject}-${topic.topic}-${sti}`;

        nodes.push({
          id: subtopicId,
          label: subtopic.subtopic,
          x: stx,
          y: sty,
          r: subtopicR,
          status: subtopic.status,
          mastery: subtopic.masteryScore,
          kind: "subtopic",
          subject: subject.subject,
          topic: topic.topic,
        });

        edges.push({
          id: `e-t-${ti}-st-${sti}-s${si}`,
          x1: tx, y1: ty, x2: stx, y2: sty,
        });
      });
    });
  });

  return { nodes, edges };
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

interface TooltipState {
  node: NodeData;
  x: number;
  y: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface SkillTreeProps {
  tree: SubjectEntry[];
  activeSubject: string | null;
  onSubjectSelect: (subject: string) => void;
}

export function SkillTree({ tree, activeSubject, onSubjectSelect }: SkillTreeProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [dims, setDims] = useState({ width: 560, height: 380 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Responsive width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = entry.contentRect.width;
      setDims({ width: w, height: Math.min(400, Math.max(260, w * 0.65)) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { nodes, edges } = buildLayout(tree, dims.width, dims.height);

  // Entrance animation
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const circles = svg.querySelectorAll("circle.skill-node");
    const lines = svg.querySelectorAll("line.skill-edge");
    gsap.set(lines, { opacity: 0 });
    gsap.set(circles, { scale: 0, transformOrigin: "center center" });
    gsap.to(lines, { opacity: 0.35, duration: 0.4, stagger: 0.008, ease: "power2.out", delay: 0.05 });
    gsap.to(circles, {
      scale: 1,
      duration: 0.35,
      stagger: 0.015,
      ease: "back.out(1.4)",
      delay: 0.15,
    });
  }, [tree.length, dims]);

  const handleNodeClick = useCallback(
    (node: NodeData) => {
      if (node.kind === "subject") onSubjectSelect(node.subject);
    },
    [onSubjectSelect]
  );

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<SVGCircleElement>, node: NodeData) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      setTooltip({
        node,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    },
    []
  );

  return (
    <div ref={containerRef} className="relative w-full select-none">
      <svg
        ref={svgRef}
        width={dims.width}
        height={dims.height}
        viewBox={`0 0 ${dims.width} ${dims.height}`}
        className="w-full"
        role="img"
        aria-label="Skill map"
      >
        {/* Edges */}
        {edges.map((e) => (
          <line
            key={e.id}
            className="skill-edge"
            x1={e.x1}
            y1={e.y1}
            x2={e.x2}
            y2={e.y2}
            stroke="#cbd5e1"
            strokeWidth={1}
          />
        ))}

        {/* Nodes */}
        {nodes.map((node) => {
          const isActive = node.subject === activeSubject;
          const isSubject = node.kind === "subject";
          const fill = STATUS_FILL[node.status];
          const stroke = isActive && isSubject ? "#0f172a" : STATUS_STROKE[node.status];
          const strokeWidth = isActive && isSubject ? 2.5 : 1.5;
          const opacity = activeSubject && node.subject !== activeSubject ? 0.35 : 1;

          return (
            <circle
              key={node.id}
              className="skill-node cursor-pointer transition-[opacity] duration-200"
              cx={node.x}
              cy={node.y}
              r={node.r}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
              opacity={opacity}
              onClick={() => handleNodeClick(node)}
              onMouseEnter={(e) => handleMouseEnter(e, node)}
              onMouseLeave={() => setTooltip(null)}
              aria-label={`${node.label} — ${node.mastery}% mastery`}
            />
          );
        })}

        {/* Subject labels */}
        {nodes
          .filter((n) => n.kind === "subject")
          .map((node) => {
            const truncated = node.label.length > 10 ? node.label.slice(0, 10) + "…" : node.label;
            return (
              <text
                key={`label-${node.id}`}
                x={node.x}
                y={node.y + node.r + 11}
                textAnchor="middle"
                fontSize={9}
                fontWeight={500}
                fill="#64748b"
                className="pointer-events-none"
              >
                {truncated}
              </text>
            );
          })}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 rounded-md border border-slate-200 bg-white px-3 py-2 shadow-md text-xs"
          style={{
            left: Math.min(tooltip.x + 12, dims.width - 160),
            top: Math.max(tooltip.y - 40, 0),
          }}
        >
          <p className="font-medium text-slate-900">{tooltip.node.label}</p>
          <p className="text-slate-500 mt-0.5">
            {tooltip.node.kind === "subtopic"
              ? `${tooltip.node.topic} · `
              : ""}
            {tooltip.node.mastery}/100 mastery
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-3">
        {(["locked", "learning", "proficient", "mastered"] as MasteryStatus[]).map((s) => (
          <div key={s} className="flex items-center gap-1.5">
            <div
              className="h-2.5 w-2.5 rounded-full border"
              style={{ background: STATUS_FILL[s], borderColor: STATUS_STROKE[s] }}
            />
            <span className="text-[10px] text-slate-500 capitalize">{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
