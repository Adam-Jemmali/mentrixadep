"use client";

import { useState } from "react";
import { Textarea } from "@/shared/ui/textarea";
import { Button } from "@/shared/ui/button";

interface ResolveInputProps {
  onSubmit: (problemText: string) => void | Promise<void>;
  isLoading: boolean;
}

export function ResolveInput({ onSubmit, isLoading }: ResolveInputProps) {
  const [value, setValue] = useState("");

  return (
    <div className="space-y-3">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Describe what you’re stuck on (topic, what you tried, where it breaks)…"
        className="min-h-[140px] resize-y bg-white border-slate-200"
        disabled={isLoading}
      />
      <Button
        type="button"
        disabled={isLoading || value.trim().length < 8}
        onClick={() => void onSubmit(value)}
        className="w-full sm:w-auto"
      >
        {isLoading ? "Working…" : "Continue"}
      </Button>
    </div>
  );
}
