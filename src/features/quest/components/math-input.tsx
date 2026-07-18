"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Keyboard, Loader2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { warmKatex } from "@/features/quest/ui/normalize-math-text";
import { gradeExpression } from "@/features/free-response/grade-expression-action";
import {
  studentNotationToLatex,
} from "@/features/quest/components/math-input-pure";
import type { GradingVariables } from "@/features/free-response/symbolic-grade-pure";
import { cn } from "@/shared/core/utils";

type KatexModule = typeof import("katex");

type Props = {
  itemId: string;
  /** Required for grade mode; omitted for compose (server grades). */
  correctExpression?: string;
  variables?: GradingVariables;
  placeholder?: string;
  disabled?: boolean;
  /** grade = admin preview with answer; compose = student pack (no answer on client). */
  mode?: "grade" | "compose";
  surface?: "dark" | "light";
  submitLabel?: string;
  onGraded?: (result: {
    equivalent: boolean;
    method: "symbolic" | "numeric";
    verdict: string;
    nextAction: string;
  }) => void;
  onComposeSubmit?: (value: string) => void | Promise<void>;
};

type PreviewState =
  | { status: "empty" }
  | { status: "ok"; html: string }
  | { status: "error"; message: string };

const GREEK_KEYS = [
  { label: "α", value: "α" },
  { label: "β", value: "β" },
  { label: "θ", value: "θ" },
  { label: "π", value: "π" },
  { label: "Δ", value: "Δ" },
  { label: "λ", value: "λ" },
] as const;

function IntegralIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 4c0 10 2 14 8 16" strokeLinecap="round" />
    </svg>
  );
}

function DerivativeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <text x="2" y="11" fontSize="8" fontFamily="Geist, system-ui, sans-serif" fontWeight="700">
        d
      </text>
      <rect x="2" y="13" width="14" height="1.5" rx="0.5" />
      <text x="2" y="21" fontSize="8" fontFamily="Geist, system-ui, sans-serif" fontWeight="700">
        dx
      </text>
    </svg>
  );
}

function renderPreview(latex: string, katex: KatexModule["default"]): PreviewState {
  if (!latex.trim()) return { status: "empty" };
  try {
    const html = katex.renderToString(latex, {
      throwOnError: true,
      displayMode: true,
      strict: "ignore",
    });
    if (html.includes("katex-error")) {
      return { status: "error", message: "Fix the notation to see a preview." };
    }
    return { status: "ok", html };
  } catch {
    return { status: "error", message: "Fix the notation to see a preview." };
  }
}

export function MathInput({
  itemId,
  correctExpression,
  variables,
  placeholder = "Type your answer: 3x^2 + 2x",
  disabled = false,
  mode = "grade",
  surface = "dark",
  submitLabel,
  onGraded,
  onComposeSubmit,
}: Props) {
  const [value, setValue] = useState("");
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [katex, setKatex] = useState<KatexModule["default"] | null>(null);
  const [preview, setPreview] = useState<PreviewState>({ status: "empty" });
  const [retryNote, setRetryNote] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isLight = surface === "light";

  useEffect(() => {
    void warmKatex().then((mod) => setKatex(mod.default));
  }, []);

  const latex = useMemo(() => studentNotationToLatex(value), [value]);

  useEffect(() => {
    if (!katex) return;
    const timer = window.setTimeout(() => {
      setPreview(renderPreview(latex, katex));
    }, 80);
    return () => window.clearTimeout(timer);
  }, [katex, latex]);

  const canSubmit =
    !disabled &&
    !submitting &&
    value.trim().length > 0 &&
    preview.status === "ok" &&
    (mode === "compose" || Boolean(correctExpression));

  const insertAtCursor = useCallback((snippet: string) => {
    const el = inputRef.current;
    if (!el) {
      setValue((current) => current + snippet);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + snippet + value.slice(end);
    setValue(next);
    const cursor = start + snippet.length;
    window.requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursor, cursor);
    });
  }, [value]);

  const onSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setRetryNote(null);
    const started = Date.now();

    if (mode === "compose") {
      await onComposeSubmit?.(value.trim());
      const elapsed = Date.now() - started;
      if (elapsed < 400) {
        await new Promise((resolve) => window.setTimeout(resolve, 400 - elapsed));
      }
      setSubmitting(false);
      return;
    }

    const result = await gradeExpression({
      itemId,
      studentExpression: value.trim(),
      correctExpression: correctExpression ?? "",
      variables,
    });

    const elapsed = Date.now() - started;
    if (elapsed < 400) {
      await new Promise((resolve) => window.setTimeout(resolve, 400 - elapsed));
    }

    setSubmitting(false);

    if ("error" in result) {
      setRetryNote(result.error);
      return;
    }

    if (!result.equivalent) {
      setRetryNote(result.verdict);
    } else {
      setRetryNote(null);
    }

    onGraded?.(result);
  };

  return (
    <div className="space-y-3">
      {retryNote ? (
        <p
          role="status"
          className={cn(
            "rounded-lg border px-3 py-2 text-sm",
            isLight
              ? "border-amber-300 bg-amber-50 text-amber-950"
              : "border-amber-500/35 bg-amber-500/10 text-amber-100",
          )}
        >
          {retryNote}
        </p>
      ) : null}

      <div
        className={cn(
          "overflow-hidden rounded-xl border shadow-[inset_0_1px_0_rgba(148,163,184,0.08)]",
          isLight ? "border-slate-200 bg-white" : "border-[#1e293b] bg-[#0B1220]",
        )}
      >
        <textarea
          ref={inputRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          disabled={disabled || submitting}
          spellCheck={false}
          autoComplete="off"
          rows={4}
          className={cn(
            "w-full resize-y border-0 bg-transparent px-4 py-3 font-mono text-base leading-relaxed focus:outline-none focus:ring-0",
            isLight
              ? "text-slate-900 placeholder:text-slate-400"
              : "text-slate-100 placeholder:text-slate-500",
          )}
        />

        <div
          className={cn(
            "border-t px-4 py-3",
            isLight ? "border-slate-100 bg-slate-50" : "border-[#1e293b] bg-[#090f1d]",
          )}
        >
          <p
            className={cn(
              "text-[10px] font-semibold uppercase tracking-[0.16em]",
              isLight ? "text-[#6366F1]" : "text-[#6366F1]",
            )}
          >
            Live preview
          </p>
          <div
            className={cn(
              "mx-hub-math-prose mt-2 min-h-[2.75rem] [&_.katex]:text-inherit",
              isLight ? "text-slate-900" : "text-slate-100",
              preview.status === "error" && (isLight ? "text-amber-800" : "text-amber-200/90"),
            )}
          >
            {preview.status === "empty" ? (
              <span className={cn("text-sm", isLight ? "text-slate-500" : "text-slate-500")}>
                Your formatted math appears here.
              </span>
            ) : null}
            {preview.status === "error" ? (
              <span className="text-sm">{preview.message}</span>
            ) : null}
            {preview.status === "ok" ? (
              <span dangerouslySetInnerHTML={{ __html: preview.html }} />
            ) : null}
          </div>
        </div>
      </div>

      <div
        className={cn(
          "overflow-hidden rounded-xl border",
          isLight ? "border-slate-200 bg-white" : "border-[#334155] bg-[#0f172a]",
        )}
      >
        <button
          type="button"
          onClick={() => setKeyboardOpen((open) => !open)}
          className={cn(
            "flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-semibold",
            isLight ? "text-slate-800" : "text-slate-200",
          )}
        >
          <span className="inline-flex items-center gap-2">
            <Keyboard className="size-4 text-[#6366F1]" aria-hidden />
            Math keyboard
          </span>
          <ChevronDown
            className={cn("size-4 transition-transform", keyboardOpen && "rotate-180")}
            aria-hidden
          />
        </button>

        {keyboardOpen ? (
          <div
            className={cn(
              "space-y-3 border-t px-3 py-3",
              isLight ? "border-slate-200" : "border-[#334155]",
            )}
          >
            <div className="flex flex-wrap gap-2">
              {GREEK_KEYS.map((key) => (
                <Button
                  key={key.label}
                  type="button"
                  size="sm"
                  variant="secondary"
                  className={
                    isLight
                      ? "min-w-9"
                      : "min-w-9 bg-[#1e293b] text-slate-100 hover:bg-[#334155]"
                  }
                  onClick={() => insertAtCursor(key.value)}
                >
                  {key.label}
                </Button>
              ))}
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className={isLight ? undefined : "bg-[#1e293b] text-slate-100 hover:bg-[#334155]"}
                onClick={() => insertAtCursor("∫ ")}
                aria-label="Insert integral"
              >
                <IntegralIcon className="size-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className={isLight ? undefined : "bg-[#1e293b] text-slate-100 hover:bg-[#334155]"}
                onClick={() => insertAtCursor("d/dx")}
                aria-label="Insert derivative"
              >
                <DerivativeIcon className="size-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className={isLight ? undefined : "bg-[#1e293b] text-slate-100 hover:bg-[#334155]"}
                onClick={() => insertAtCursor("()/()")}
              >
                Fraction
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className={isLight ? undefined : "bg-[#1e293b] text-slate-100 hover:bg-[#334155]"}
                onClick={() => insertAtCursor("^")}
              >
                x^n
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className={isLight ? undefined : "bg-[#1e293b] text-slate-100 hover:bg-[#334155]"}
                onClick={() => insertAtCursor("sqrt()")}
              >
                sqrt
              </Button>
            </div>
            <p className={cn("text-xs", isLight ? "text-slate-500" : "text-slate-400")}>
              Use ^ exponents, optional *, / fractions, sqrt(), sin(), ln(), e^x.
            </p>
          </div>
        ) : null}
      </div>

      <Button
        type="button"
        disabled={!canSubmit}
        onClick={() => void onSubmit()}
        className="w-full sm:w-auto"
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
            Checking construction…
          </>
        ) : (
          submitLabel ?? "Submit answer"
        )}
      </Button>
    </div>
  );
}
