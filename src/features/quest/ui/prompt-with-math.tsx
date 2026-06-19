"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  normalizeMathText,
  textContainsMath,
  warmKatex,
} from "@/features/quest/ui/normalize-math-text";

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

/**
 * Renders plain text with optional inline/block LaTeX: \( ... \), $$ ... $$, $ ... $,
 * and bare commands like \frac{a}{b}.
 */
export function PromptWithMath({ text }: { text: string }) {
  const [katex, setKatex] = useState<KatexModule["default"] | null>(null);
  const needsMath = textContainsMath(text);
  const normalizedPreview = useMemo(
    () => (needsMath ? normalizeMathText(text) : text),
    [needsMath, text],
  );

  useEffect(() => {
    if (!needsMath) return;
    let active = true;
    void warmKatex().then((mod) => {
      if (!active) return;
      setKatex(mod.default);
    });
    return () => {
      active = false;
    };
  }, [needsMath, text]);

  const parts = useMemo(() => {
    if (!katex) return null;
    return renderMathParts(text, katex);
  }, [text, katex]);

  if (!needsMath) {
    return (
      <div className="text-sm leading-relaxed text-zinc-900 whitespace-pre-wrap">{text}</div>
    );
  }

  if (!katex || !parts) {
    return (
      <div className="text-sm leading-relaxed text-zinc-900 whitespace-pre-wrap animate-pulse">
        {normalizedPreview.replace(/\$/g, "")}
      </div>
    );
  }

  return <div className="text-sm leading-relaxed text-zinc-900">{parts}</div>;
}
