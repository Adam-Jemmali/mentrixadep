"use client";

import type { ReactNode } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

/**
 * Renders plain text with optional inline/block LaTeX: \( ... \) and $$ ... $$.
 */
export function PromptWithMath({ text }: { text: string }) {
  // Some generators escape inline math dollars as \$...\$.
  const normalizedText = text.replace(/\\\$/g, "$");
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
          className={displayMode ? "block my-2" : "inline"}
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
  return <div className="text-slate-800 text-sm leading-relaxed">{parts}</div>;
}
