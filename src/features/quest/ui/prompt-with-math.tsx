"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  formatQuestPromptText,
  parseQuestPromptBlocks,
} from "@/features/quest/ui/format-quest-prompt";
import { QuestPromptTable } from "@/features/quest/ui/quest-prompt-table";
import {
  normalizeMathText,
  textContainsMath,
  warmKatex,
} from "@/features/quest/ui/normalize-math-text";
import { cn } from "@/shared/core/utils";

type KatexModule = typeof import("katex");

function renderMathParts(text: string, katex: KatexModule["default"]): ReactNode[] {
  const normalizedText = normalizeMathText(text);
  const parts: ReactNode[] = [];
  let key = 0;
  const re = /\\\(([\s\S]*?)\\\)|\$\$([\s\S]*?)\$\$|\$([^$\n]+?)\$/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(normalizedText)) !== null) {
    if (m.index > last) {
      parts.push(
        <span key={key++} className="whitespace-pre-wrap">
          {normalizedText.slice(last, m.index)}
        </span>,
      );
    }
    const displayMode = m[2] !== undefined;
    const inner = (m[1] ?? m[2] ?? m[3] ?? "").trim();
    try {
      const html = katex.renderToString(inner, {
        throwOnError: false,
        displayMode,
      });
      parts.push(
        <span
          key={key++}
          className={displayMode ? "my-2 block" : "inline"}
          dangerouslySetInnerHTML={{ __html: html }}
        />,
      );
    } catch {
      parts.push(<span key={key++}>{m[0]}</span>);
    }
    last = m.index + m[0].length;
  }
  if (last < normalizedText.length) {
    parts.push(
      <span key={key++} className="whitespace-pre-wrap">
        {normalizedText.slice(last)}
      </span>,
    );
  }
  return parts;
}

/** Render a short string with optional inline LaTeX (table cells, options). */
export function PromptWithMathInline({
  text,
  plainNumeric = false,
  className,
}: {
  text: string;
  plainNumeric?: boolean;
  className?: string;
}) {
  const formatted = useMemo(() => formatQuestPromptText(text), [text]);
  const needsMath = textContainsMath(formatted);
  const [katex, setKatex] = useState<KatexModule["default"] | null>(null);

  useEffect(() => {
    if (!needsMath) return;
    let active = true;
    void warmKatex().then((mod) => {
      if (active) setKatex(mod.default);
    });
    return () => {
      active = false;
    };
  }, [needsMath, formatted]);

  const parts = useMemo(() => {
    if (!katex || !needsMath) return null;
    return renderMathParts(formatted, katex);
  }, [formatted, katex, needsMath]);

  if (!needsMath) {
    return (
      <span className={cn(plainNumeric ? "tabular-nums" : undefined, className)}>
        {formatted}
      </span>
    );
  }

  if (!katex || !parts) {
    return (
      <span className={cn("animate-pulse", className)}>
        {formatted.replace(/\$/g, "")}
      </span>
    );
  }

  return <span className={className}>{parts}</span>;
}

function PromptTextBlock({
  text,
  variant = "light",
}: {
  text: string;
  variant?: "light" | "dark";
}) {
  const formatted = useMemo(() => formatQuestPromptText(text), [text]);
  const needsMath = textContainsMath(formatted);
  const [katex, setKatex] = useState<KatexModule["default"] | null>(null);
  const proseClass =
    variant === "dark"
      ? "text-sm leading-relaxed text-slate-200"
      : "text-sm leading-relaxed text-zinc-900";

  useEffect(() => {
    if (!needsMath) return;
    let active = true;
    void warmKatex().then((mod) => {
      if (active) setKatex(mod.default);
    });
    return () => {
      active = false;
    };
  }, [needsMath, formatted]);

  const parts = useMemo(() => {
    if (!katex || !needsMath) return null;
    return renderMathParts(formatted, katex);
  }, [formatted, katex, needsMath]);

  if (!needsMath) {
    return <p className={cn(proseClass, "whitespace-pre-wrap")}>{formatted}</p>;
  }

  if (!katex || !parts) {
    return (
      <p className={cn(proseClass, "whitespace-pre-wrap animate-pulse")}>
        {formatted.replace(/\$/g, "")}
      </p>
    );
  }

  return <div className={cn(proseClass, "space-y-2 break-words")}>{parts}</div>;
}

/**
 * Renders quest prompts: prose, markdown pipe tables, and LaTeX.
 * Handles item-bank backticks and `lim_(t->2)` style notation.
 */
export function PromptWithMath({
  text,
  variant = "light",
}: {
  text: string;
  variant?: "light" | "dark";
}) {
  const blocks = useMemo(() => parseQuestPromptBlocks(text), [text]);
  const needsMath = useMemo(
    () =>
      blocks.some(
        (b) => b.type === "text" && textContainsMath(formatQuestPromptText(b.content)),
      ),
    [blocks],
  );

  useEffect(() => {
    if (needsMath || text.includes("|")) void warmKatex();
  }, [needsMath, text]);

  return (
    <div className="space-y-3">
      {blocks.map((block, i) =>
        block.type === "table" ? (
          <QuestPromptTable
            key={`table-${i}`}
            headers={block.headers}
            rows={block.rows}
            variant={variant}
          />
        ) : (
          <PromptTextBlock key={`text-${i}`} text={block.content} variant={variant} />
        ),
      )}
    </div>
  );
}
