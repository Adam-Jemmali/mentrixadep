"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  formatQuestPromptText,
  parseQuestPromptBlocks,
} from "@/features/quest/ui/format-quest-prompt";
import { tokenizeQuestPromptHighlights } from "@/features/quest/ui/quest-prompt-highlight-pure";
import { questPromptHighlightSpanClass } from "@/features/quest/ui/quest-prompt-highlight-styles";
import { QuestPromptTable } from "@/features/quest/ui/quest-prompt-table";
import {
  normalizeMathText,
  textContainsMath,
  warmKatex,
} from "@/features/quest/ui/normalize-math-text";
import { cn } from "@/shared/core/utils";

type KatexModule = typeof import("katex");

function HighlightedProse({
  text,
  variant,
}: {
  text: string;
  variant: "light" | "dark";
}) {
  const tokens = useMemo(() => tokenizeQuestPromptHighlights(text), [text]);
  return (
    <>
      {tokens.map((token, index) => {
        const className = questPromptHighlightSpanClass(token.kind, variant);
        if (!className) {
          return (
            <span key={index} className="whitespace-pre-wrap">
              {token.text}
            </span>
          );
        }
        return (
          <span key={index} className={className}>
            {token.text}
          </span>
        );
      })}
    </>
  );
}

function renderProseSpan(
  text: string,
  key: number,
  options: { highlightKeyTerms: boolean; variant: "light" | "dark" },
): ReactNode {
  if (!text) return null;
  if (options.highlightKeyTerms) {
    return (
      <span key={key}>
        <HighlightedProse text={text} variant={options.variant} />
      </span>
    );
  }
  return (
    <span key={key} className="whitespace-pre-wrap">
      {text}
    </span>
  );
}

function renderMathParts(
  text: string,
  katex: KatexModule["default"],
  options: { highlightKeyTerms: boolean; variant: "light" | "dark" },
): ReactNode[] {
  const normalizedText = normalizeMathText(text);
  const parts: ReactNode[] = [];
  let key = 0;
  const re = /\\\(([\s\S]*?)\\\)|\$\$([\s\S]*?)\$\$|\$([^$\n]+?)\$/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(normalizedText)) !== null) {
    if (m.index > last) {
      parts.push(
        renderProseSpan(normalizedText.slice(last, m.index), key++, options),
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
    parts.push(renderProseSpan(normalizedText.slice(last), key++, options));
  }
  return parts;
}

/** Render a short string with optional inline LaTeX (table cells, options). */
export function PromptWithMathInline({
  text,
  plainNumeric = false,
  highlightKeyTerms = false,
  variant = "light",
  className,
}: {
  text: string;
  plainNumeric?: boolean;
  highlightKeyTerms?: boolean;
  variant?: "light" | "dark";
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

  const renderOptions = useMemo(
    () => ({ highlightKeyTerms, variant }),
    [highlightKeyTerms, variant],
  );

  const parts = useMemo(() => {
    if (!katex || !needsMath) return null;
    return renderMathParts(formatted, katex, renderOptions);
  }, [formatted, katex, needsMath, renderOptions]);

  if (!needsMath) {
    return (
      <span className={cn(plainNumeric ? "tabular-nums" : undefined, className)}>
        {highlightKeyTerms ? (
          <HighlightedProse text={formatted} variant={variant} />
        ) : (
          formatted
        )}
      </span>
    );
  }

  if (!katex || !parts) {
    return (
      <span className={cn("whitespace-pre-wrap", className)}>
        {highlightKeyTerms ? (
          <HighlightedProse text={formatted} variant={variant} />
        ) : (
          formatted
        )}
      </span>
    );
  }

  return <span className={cn("mx-hub-math-prose inline-block max-w-full overflow-x-auto align-middle [&_.katex]:text-inherit", className)}>{parts}</span>;
}

function PromptTextBlock({
  text,
  variant = "light",
  highlightKeyTerms = false,
}: {
  text: string;
  variant?: "light" | "dark";
  highlightKeyTerms?: boolean;
}) {
  const formatted = useMemo(() => formatQuestPromptText(text), [text]);
  const needsMath = textContainsMath(formatted);
  const [katex, setKatex] = useState<KatexModule["default"] | null>(null);
  const proseClass =
    variant === "dark"
      ? "text-sm leading-relaxed text-white"
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

  const renderOptions = useMemo(
    () => ({ highlightKeyTerms, variant }),
    [highlightKeyTerms, variant],
  );

  const parts = useMemo(() => {
    if (!katex || !needsMath) return null;
    return renderMathParts(formatted, katex, renderOptions);
  }, [formatted, katex, needsMath, renderOptions]);

  if (!needsMath) {
    return (
      <p className={cn(proseClass, "whitespace-pre-wrap")}>
        {highlightKeyTerms ? (
          <HighlightedProse text={formatted} variant={variant} />
        ) : (
          formatted
        )}
      </p>
    );
  }

  if (!katex || !parts) {
    return (
      <p className={cn(proseClass, "whitespace-pre-wrap")}>
        {highlightKeyTerms ? (
          <HighlightedProse text={formatted} variant={variant} />
        ) : (
          formatted
        )}
      </p>
    );
  }

  return (
    <div
      className={cn(
        proseClass,
        "mx-hub-math-prose max-w-full space-y-2 break-words overflow-x-auto [&_.katex]:text-inherit [&_.katex-display]:overflow-x-auto",
      )}
    >
      {parts}
    </div>
  );
}

/**
 * Renders quest prompts: prose, markdown pipe tables, and LaTeX.
 * Handles item-bank backticks and `lim_(t->2)` style notation.
 */
export function PromptWithMath({
  text,
  variant = "light",
  highlightKeyTerms = false,
}: {
  text: string;
  variant?: "light" | "dark";
  highlightKeyTerms?: boolean;
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
    <div className="mx-hub-math-prose max-w-full space-y-3 overflow-x-auto">
      {blocks.map((block, i) =>
        block.type === "table" ? (
          <QuestPromptTable
            key={`table-${i}`}
            headers={block.headers}
            rows={block.rows}
            variant={variant}
            highlightKeyTerms={highlightKeyTerms}
          />
        ) : (
          <PromptTextBlock
            key={`text-${i}`}
            text={block.content}
            variant={variant}
            highlightKeyTerms={highlightKeyTerms}
          />
        ),
      )}
    </div>
  );
}
