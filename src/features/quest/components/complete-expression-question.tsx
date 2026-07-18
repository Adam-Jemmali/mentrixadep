"use client";

import { useMemo, useState } from "react";
import { MathInput } from "@/features/quest/components/math-input";
import { PromptWithMath } from "@/features/quest/ui/prompt-with-math";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/core/utils";

export function CompleteExpressionQuestion({
  itemId,
  prompt,
  blankKeys,
  busy,
  disabled,
  onSubmit,
}: {
  itemId: string;
  prompt: string;
  blankKeys: string[];
  busy?: boolean;
  disabled?: boolean;
  onSubmit: (answers: Record<string, string>) => void | Promise<void>;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries(blankKeys.map((k) => [k, ""])),
  );
  const [activeKey, setActiveKey] = useState(blankKeys[0] ?? "");

  const displayPrompt = useMemo(() => {
    let text = prompt;
    for (const key of blankKeys) {
      const filled = answers[key]?.trim();
      text = text.replace(
        new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g"),
        filled ? `[${filled}]` : `[blank ${key}]`,
      );
    }
    return text;
  }, [answers, blankKeys, prompt]);

  const allFilled = blankKeys.every((k) => (answers[k] ?? "").trim().length > 0);

  return (
    <div className="space-y-4">
      <PromptWithMath text={displayPrompt} variant="light" highlightKeyTerms />
      <div className="flex flex-wrap gap-2">
        {blankKeys.map((key) => (
          <button
            key={key}
            type="button"
            disabled={disabled || busy}
            onClick={() => setActiveKey(key)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide",
              activeKey === key
                ? "border-[#6366F1] bg-[#EDE9FE] text-[#4338CA]"
                : "border-slate-200 bg-white text-slate-600",
            )}
          >
            Blank {key}
            {(answers[key] ?? "").trim() ? " · set" : ""}
          </button>
        ))}
      </div>
      {activeKey ? (
        <MathInput
          key={activeKey}
          itemId={`${itemId}:${activeKey}`}
          mode="compose"
          surface="light"
          disabled={disabled || busy}
          placeholder={`Expression for blank ${activeKey}`}
          submitLabel={`Save blank ${activeKey}`}
          onComposeSubmit={(value) => {
            setAnswers((prev) => ({ ...prev, [activeKey]: value }));
            const idx = blankKeys.indexOf(activeKey);
            const next = blankKeys[idx + 1];
            if (next) setActiveKey(next);
          }}
        />
      ) : null}
      <Button
        type="button"
        disabled={!allFilled || busy || disabled}
        onClick={() => void onSubmit(answers)}
      >
        Submit all blanks
      </Button>
    </div>
  );
}
