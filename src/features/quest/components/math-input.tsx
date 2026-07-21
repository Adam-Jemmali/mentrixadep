"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { BklitShimmer } from "@/shared/ui/bklit-shimmer";
import { warmKatex } from "@/features/quest/ui/normalize-math-text";
import { gradeExpression } from "@/features/free-response/grade-expression-action";
import { studentNotationToLatex } from "@/features/quest/components/math-input-pure";
import type { GradingVariables } from "@/features/free-response/symbolic-grade-pure";
import { AnimatePresence, motion, useReducedMotion } from "@/shared/animation/motion";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
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

const PREVIEW_DEBOUNCE_MS = 150;

const SYMBOL_KEYS = [
  { label: "x²", insert: "^2" },
  { label: "x³", insert: "^3" },
  { label: "x^n", insert: "^" },
  { label: "a/b", insert: "()/()" },
  { label: "√", insert: "sqrt()" },
  { label: "∫", insert: "∫ " },
  { label: "d/dx", insert: "d/dx" },
  { label: "sin", insert: "sin()" },
  { label: "cos", insert: "cos()" },
  { label: "tan", insert: "tan()" },
  { label: "ln", insert: "ln()" },
  { label: "π", insert: "π" },
  { label: "θ", insert: "θ" },
  { label: "α", insert: "α" },
  { label: "β", insert: "β" },
  { label: "Δ", insert: "Δ" },
] as const;

function renderPreview(latex: string, katex: KatexModule["default"]): PreviewState {
  if (!latex.trim()) return { status: "empty" };
  try {
    const html = katex.renderToString(latex, {
      throwOnError: true,
      displayMode: true,
      strict: "ignore",
    });
    if (html.includes("katex-error")) {
      return { status: "error", message: "Check your notation" };
    }
    return { status: "ok", html };
  } catch {
    return { status: "error", message: "Check your notation" };
  }
}

function MathInputPreviewPane({
  preview,
  submitting,
  surface,
}: {
  preview: PreviewState;
  submitting: boolean;
  surface: "dark" | "light";
}) {
  const isLight = surface === "light";

  const body = (
    <div
      className={cn(
        "mx-hub-math-prose flex min-h-[5.5rem] flex-1 items-center justify-center px-4 py-4 [&_.katex]:text-inherit",
        isLight ? "text-slate-900" : "text-white",
        preview.status === "error" && (isLight ? "text-amber-700" : "text-amber-300/90"),
      )}
    >
      {preview.status === "empty" ? (
        <span className={cn("text-sm", isLight ? "text-slate-500" : "text-[var(--mx-muted)]")}>
          Your formatted math appears here.
        </span>
      ) : null}
      {preview.status === "error" ? (
        <span className="text-sm font-medium">{preview.message}</span>
      ) : null}
      {preview.status === "ok" ? (
        <span dangerouslySetInnerHTML={{ __html: preview.html }} />
      ) : null}
    </div>
  );

  return (
    <div
      className={cn(
        "relative flex min-h-[7rem] flex-col overflow-hidden rounded-[var(--radius-node)] border",
        isLight ? "border-slate-200 bg-slate-50" : "border-white/10 bg-[var(--mx-surface-3)]",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 border-b px-3 py-2",
          isLight ? "border-slate-200" : "border-white/10",
        )}
      >
        <MentrixaVocabIcon name="focus-ring" size={16} surface={surface} title="Live preview" />
        <p
          className={cn(
            "text-[10px] font-semibold uppercase tracking-[0.16em]",
            isLight ? "text-[var(--mx-indigo)]" : "text-[var(--mx-indigo)]",
          )}
        >
          Live preview
        </p>
      </div>

      {submitting ? (
        <BklitShimmer className="min-h-[5.5rem] flex-1" aria-label="Checking your answer">
          <div className="pointer-events-none opacity-40">{body}</div>
        </BklitShimmer>
      ) : (
        body
      )}
    </div>
  );
}

function MathInputSymbolKeyboard({
  open,
  onToggle,
  onInsert,
  surface,
}: {
  open: boolean;
  onToggle: () => void;
  onInsert: (snippet: string) => void;
  surface: "dark" | "light";
}) {
  const reduceMotion = useReducedMotion();
  const isLight = surface === "light";

  return (
    <div className="flex flex-col justify-end">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onToggle}
        aria-expanded={open}
        className={cn(
          "inline-flex w-fit items-center gap-2 font-semibold",
          isLight
            ? "border-slate-200 bg-white text-slate-800"
            : "border-white/15 bg-[var(--mx-surface-3)] text-white hover:bg-[var(--mx-surface-3)]/90",
        )}
      >
        <MentrixaVocabIcon name="practice-pack" size={16} surface={surface} title="Math symbols" />
        Symbols
        <ChevronDown
          className={cn("size-4 transition-transform duration-200", open && "rotate-180")}
          aria-hidden
        />
      </Button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="symbol-keyboard"
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 16 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={cn(
              "mt-2 overflow-hidden rounded-[var(--radius-node)] border p-3",
              isLight ? "border-slate-200 bg-white" : "border-white/10 bg-[var(--mx-surface-3)]",
            )}
          >
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
              {SYMBOL_KEYS.map((key) => (
                <Button
                  key={key.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-9 min-w-0 px-1 font-mono text-base",
                    isLight
                      ? "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                      : "border-white/15 bg-[var(--mx-navy-2)] text-white hover:bg-[var(--mx-surface-3)]",
                  )}
                  onClick={() => onInsert(key.insert)}
                >
                  {key.label}
                </Button>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function MathInput({
  itemId,
  correctExpression,
  variables,
  placeholder = "Type your answer here, e.g. 3x^2+2x",
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
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const reduceMotion = useReducedMotion();
  const isLight = surface === "light";

  useEffect(() => {
    void warmKatex().then((mod) => setKatex(mod.default));
  }, []);

  const latex = useMemo(() => studentNotationToLatex(value), [value]);

  useEffect(() => {
    if (!katex) return;
    const timer = window.setTimeout(() => {
      setPreview(renderPreview(latex, katex));
    }, PREVIEW_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [katex, latex]);

  const expressionValid =
    value.trim().length > 0 &&
    preview.status === "ok" &&
    (mode === "compose" || Boolean(correctExpression));

  const showSubmit = !disabled && expressionValid;
  const canSubmit = showSubmit && !submitting;

  const insertAtCursor = useCallback(
    (snippet: string) => {
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
    },
    [value],
  );

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
    <div className="mx-shell-workbench w-full space-y-4">
      {retryNote ? (
        <p
          role="status"
          className={cn(
            "rounded-[var(--radius-node)] border px-3 py-2 text-sm",
            isLight
              ? "border-amber-300 bg-amber-50 text-amber-950"
              : "border-amber-500/35 bg-amber-500/10 text-amber-100",
          )}
        >
          {retryNote}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:items-start">
        <div className="relative">
          <div
            className={cn(
              "relative overflow-hidden rounded-[var(--radius-node)] p-4 transition-[border-color,box-shadow]",
              isLight ? "bg-white" : "bg-[var(--mx-navy-2)]",
              focused
                ? "border-2 border-[var(--mx-primary)]"
                : "border border-[var(--mx-rule)]",
            )}
          >
            <textarea
              ref={inputRef}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={placeholder}
              disabled={disabled || submitting}
              spellCheck={false}
              autoComplete="off"
              rows={5}
              className={cn(
                "w-full resize-y border-0 bg-transparent font-mono text-base leading-relaxed focus:outline-none focus:ring-0",
                isLight
                  ? "text-slate-900 caret-[var(--mx-primary)] placeholder:text-slate-400"
                  : "text-white caret-white placeholder:text-[var(--mx-muted)]",
              )}
            />

            {submitting ? (
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 overflow-hidden"
                aria-hidden
              >
                <motion.div
                  className="h-full w-1/3 bg-[var(--mx-primary)]"
                  initial={{ x: "-100%" }}
                  animate={reduceMotion ? undefined : { x: ["-100%", "300%"] }}
                  transition={
                    reduceMotion
                      ? undefined
                      : { duration: 1.5, repeat: Infinity, ease: "linear" }
                  }
                />
              </div>
            ) : null}
          </div>
        </div>

        <MathInputPreviewPane preview={preview} submitting={submitting} surface={surface} />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <MathInputSymbolKeyboard
          open={keyboardOpen}
          onToggle={() => setKeyboardOpen((open) => !open)}
          onInsert={insertAtCursor}
          surface={surface}
        />
      </div>

      <AnimatePresence initial={false}>
        {showSubmit ? (
          <motion.div
            key="math-input-submit"
            initial={reduceMotion ? false : { scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={reduceMotion ? undefined : { scale: 0, opacity: 0 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 400, damping: 20 }
            }
          >
            <Button
              type="button"
              disabled={!canSubmit}
              onClick={() => void onSubmit()}
              className="w-full sm:w-auto"
            >
              <span className="inline-flex items-center gap-2">
                <MentrixaVocabIcon
                  name="verified"
                  size={16}
                  surface={surface}
                  title="Submit answer"
                />
                {submitting ? "Checking construction…" : (submitLabel ?? "Submit answer")}
              </span>
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
