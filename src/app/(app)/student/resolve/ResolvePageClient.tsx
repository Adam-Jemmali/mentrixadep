"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { submitResolveProblem } from "@/features/resolve/resolve";
import katex from "katex";
import "katex/dist/katex.min.css";
import { resolveIntakeSchema } from "@/shared/core/schemas";

type Difficulty = "no_idea" | "concept_but_stuck" | "minor_confusion";

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderLatexPreview(raw: string): string {
  if (!raw.trim()) return "";
  const escaped = escapeHtml(raw);

  const withBlock = escaped.replace(/\$\$([\s\S]+?)\$\$/g, (_, expr: string) => {
    try {
      return katex.renderToString(expr.trim(), {
        throwOnError: false,
        displayMode: true,
        strict: "ignore",
      });
    } catch {
      return `<code>${escapeHtml(expr)}</code>`;
    }
  });

  const withInline = withBlock.replace(/\$([^$\n]+?)\$/g, (_, expr: string) => {
    try {
      return katex.renderToString(expr.trim(), {
        throwOnError: false,
        displayMode: false,
        strict: "ignore",
      });
    } catch {
      return `<code>${escapeHtml(expr)}</code>`;
    }
  });

  return withInline.replace(/\n/g, "<br />");
}

export function ResolvePageClient({ subjects }: { subjects: string[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState(subjects[0] ?? "");
  const [problemText, setProblemText] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("concept_but_stuck");
  const [bookTutorIfAiFails, setBookTutorIfAiFails] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const previewHtml = useMemo(() => renderLatexPreview(problemText), [problemText]);

  async function handleSubmit() {
    const valid = resolveIntakeSchema.safeParse({
      subject: subject.trim(),
      problemText: problemText.trim(),
      difficulty,
      bookTutorIfAiFails,
    });
    if (!valid.success) {
      setError(valid.error.issues[0]?.message ?? "Please fill all required fields.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("subject", subject.trim());
      formData.set("problemText", problemText.trim());
      formData.set("difficulty", difficulty);
      formData.set("bookTutorIfAiFails", String(bookTutorIfAiFails));
      if (imageFile) formData.set("image", imageFile);

      const result = await submitResolveProblem(formData);
      if ("error" in result && result.error) {
        setError(result.message);
        return;
      }
      if ("problemId" in result) {
        router.push(`/student/resolve/${result.problemId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-2">
          {error}
        </p>
      )}

      <section className="rounded-md border border-slate-200 bg-white p-5 space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Subject</label>
            {subjects.length > 0 ? (
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                disabled={isLoading}
              >
                {subjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Calculus"
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                disabled={isLoading}
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Difficulty self-assessment
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
              disabled={isLoading}
            >
              <option value="no_idea">I have no idea</option>
              <option value="concept_but_stuck">I understand the concept but stuck</option>
              <option value="minor_confusion">Minor confusion</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">
            Problem description
          </label>
          <textarea
            value={problemText}
            onChange={(e) => setProblemText(e.target.value)}
            placeholder="Paste the question and what you've tried. Use $...$ or $$...$$ for LaTeX."
            className="min-h-[180px] w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            disabled={isLoading}
          />
          <p className="mt-1 text-[11px] text-slate-400">
            Supports LaTeX with KaTeX: inline <code>$x^2$</code> and block{" "}
            <code>$$\\int_0^1 x\\,dx$$</code>.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Problem image (optional)</label>
          <div className="flex items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              className="text-xs"
              disabled={isLoading}
            />
            {imageFile && (
              <span className="text-xs text-slate-500">
                {imageFile.name} ({Math.round(imageFile.size / 1024)} KB)
              </span>
            )}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={bookTutorIfAiFails}
            onChange={(e) => setBookTutorIfAiFails(e.target.checked)}
            className="rounded border-slate-300"
            disabled={isLoading}
          />
          Book a tutor if AI can&apos;t solve this
        </label>

        {previewHtml && (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 mb-2">
              Preview
            </p>
            <div
              className="prose prose-sm max-w-none text-slate-800"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        )}

        <button
          type="button"
          disabled={isLoading || problemText.trim().length < 12 || !subject.trim()}
          onClick={() => void handleSubmit()}
          className="h-10 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
        >
          {isLoading ? "Solving…" : "Solve with Resolve"}
        </button>
      </section>
    </div>
  );
}
