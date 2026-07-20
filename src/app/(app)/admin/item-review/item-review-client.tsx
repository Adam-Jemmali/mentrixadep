"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Check, Loader2, Search, X } from "lucide-react";
import { MentrixaFilterSelect } from "@/shared/ui/select-patterns";
import {
  approveItemBankItem,
  getItemReviewDetail,
  getItemReviewQueue,
  rejectItemBankItem,
  updateItemSecondarySkillTags,
  type ItemReviewDetail,
  type ItemReviewListItem,
  type ItemReviewQueuePayload,
} from "@/features/admin/item-review";
import {
  itemFormatLabel,
  itemReviewEmptyMessage,
  itemReviewNextAction,
  itemReviewQueueSubtitle,
  itemStatusLabel,
  truncatePrompt,
  type ItemReviewQueueFilter,
} from "@/features/admin/item-review-pure";
import { ItemReviewStudentPreview } from "@/features/admin/item-review-preview";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { cn } from "@/shared/core/utils";

type Props = {
  initial: ItemReviewQueuePayload;
};

type Tab = "review" | "preview";

export function ItemReviewClient({ initial }: Props) {
  const [filter, setFilter] = useState<ItemReviewQueueFilter>("pending_review");
  const [queue, setQueue] = useState(initial);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initial.items[0]?.id ?? null);
  const [detail, setDetail] = useState<ItemReviewDetail | null>(null);
  const [tab, setTab] = useState<Tab>("review");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [tagsDraft, setTagsDraft] = useState("");

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return queue.items;
    return queue.items.filter(
      (item) =>
        item.prompt.toLowerCase().includes(q) ||
        item.nodeName.toLowerCase().includes(q) ||
        item.unitName.toLowerCase().includes(q),
    );
  }, [queue.items, search]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoadingDetail(true);
    void getItemReviewDetail(selectedId).then((row) => {
      if (cancelled) return;
      setDetail(row);
      setTagsDraft(row?.secondarySkillTags.join(", ") ?? "");
      setLoadingDetail(false);
      setTab("review");
      setMessage(null);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const refresh = (nextFilter: ItemReviewQueueFilter = filter) => {
    startTransition(async () => {
      const next = await getItemReviewQueue(nextFilter);
      setQueue(next);
      if (!next.items.some((item) => item.id === selectedId)) {
        setSelectedId(next.items[0]?.id ?? null);
      }
    });
  };

  const onFilterChange = (value: string) => {
    const next = value as ItemReviewQueueFilter;
    setFilter(next);
    startTransition(async () => {
      const payload = await getItemReviewQueue(next);
      setQueue(payload);
      setSelectedId(payload.items[0]?.id ?? null);
    });
  };

  const onApprove = () => {
    if (!selectedId) return;
    startTransition(async () => {
      const result = await approveItemBankItem(selectedId);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setMessage("Approved. Live for students.");
      refresh("pending_review");
      setFilter("pending_review");
    });
  };

  const onReject = () => {
    if (!selectedId) return;
    startTransition(async () => {
      const result = await rejectItemBankItem(selectedId);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setMessage("Rejected.");
      refresh("pending_review");
      setFilter("pending_review");
    });
  };

  const onSaveTags = () => {
    if (!selectedId) return;
    const tags = tagsDraft
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    startTransition(async () => {
      const result = await updateItemSecondarySkillTags(selectedId, tags);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setTagsDraft(result.tags.join(", "));
      setDetail((prev) =>
        prev ? { ...prev, secondarySkillTags: result.tags } : prev,
      );
      setMessage("Tags saved.");
    });
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold text-slate-900 tracking-tight">Item review</h1>
        <p className="text-[13px] text-slate-500 mt-1">
          {itemReviewQueueSubtitle(queue.pendingCount, queue.approvedCount)}
        </p>
        <p className="text-[12px] text-slate-400 mt-1">{itemReviewNextAction(queue.pendingCount)}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"
            strokeWidth={2}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prompt or skill node..."
            className="w-full pl-9 pr-4 py-2 text-[13px] border border-[#E5E7EB] rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 transition-all"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
            </button>
          ) : null}
        </div>
        <MentrixaFilterSelect
          aria-label="Filter items by status"
          value={filter}
          onChange={onFilterChange}
          options={[
            { id: "pending_review", label: "Pending" },
            { id: "approved", label: "Approved" },
            { id: "rejected", label: "Rejected" },
            { id: "all", label: "All" },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-4">
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          {filteredItems.length === 0 ? (
            <div className="py-16 text-center text-[13px] text-slate-400">
              {itemReviewEmptyMessage(filter)}
            </div>
          ) : (
            <ul className="divide-y divide-[#F3F4F6] max-h-[70vh] overflow-auto">
              {filteredItems.map((item) => (
                <QueueRow
                  key={item.id}
                  item={item}
                  active={item.id === selectedId}
                  onSelect={() => setSelectedId(item.id)}
                />
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 sm:p-5 min-h-[420px]">
          {!selectedId ? (
            <p className="text-[13px] text-slate-400 py-12 text-center">Select an item.</p>
          ) : loadingDetail || !detail ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading item…
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  {itemFormatLabel(detail.itemFormat)}
                </span>
                <span className="text-slate-300">·</span>
                <span className="text-[11px] text-slate-500">{itemStatusLabel(detail.status)}</span>
                <span className="text-slate-300">·</span>
                <span className="text-[11px] text-slate-500">
                  Unit {detail.unitNumber} · {detail.nodeName}
                </span>
              </div>

              <div className="flex gap-1 mb-4 border-b border-[#F3F4F6]">
                {(
                  [
                    { id: "review", label: "Review" },
                    { id: "preview", label: "Preview" },
                  ] as const
                ).map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setTab(entry.id)}
                    className={cn(
                      "px-3 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors",
                      tab === entry.id
                        ? "border-slate-900 text-slate-900"
                        : "border-transparent text-slate-400 hover:text-slate-700",
                    )}
                  >
                    {entry.label}
                  </button>
                ))}
              </div>

              {tab === "review" ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Prompt
                    </p>
                    <p className="mt-1 text-[14px] text-slate-900 whitespace-pre-wrap">{detail.prompt}</p>
                  </div>

                  {detail.itemFormat === "mcq" ? (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Options
                      </p>
                      <ul className="mt-2 space-y-1.5">
                        {detail.options.map((option) => (
                          <li
                            key={option}
                            className={cn(
                              "rounded-lg border px-3 py-2 text-[13px]",
                              option === detail.correctAnswer
                                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                                : "border-[#E5E7EB] text-slate-700",
                            )}
                          >
                            {option}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                          Answer expression
                        </p>
                        <p className="mt-1 font-mono text-[13px] text-slate-900">
                          {detail.answerExpression || detail.correctAnswer}
                        </p>
                      </div>
                      {detail.solutionSteps.length > 0 ? (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                            Solution steps
                          </p>
                          <ol className="mt-2 space-y-2">
                            {detail.solutionSteps.map((step) => (
                              <li
                                key={step.step_number}
                                className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-[13px] text-slate-700"
                              >
                                <span className="font-medium text-slate-900">
                                  {step.step_number}. {step.description}
                                </span>
                                {step.expression ? (
                                  <p className="mt-1 font-mono text-[12px] text-slate-600">
                                    {step.expression}
                                  </p>
                                ) : null}
                                {step.is_critical ? (
                                  <p className="mt-1 text-[11px] text-amber-700">Critical</p>
                                ) : null}
                              </li>
                            ))}
                          </ol>
                        </div>
                      ) : null}
                    </div>
                  )}

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Explanation
                    </p>
                    <p className="mt-1 text-[13px] text-slate-600 whitespace-pre-wrap">
                      {detail.explanation}
                    </p>
                  </div>

                  <div>
                    <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      <MentrixaVocabIcon
                        name="skills"
                        size={16}
                        surface="light"
                        title="Cause tags"
                      />
                      Cause tags
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Reviewed slugs only. Comma separated.
                    </p>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                      <input
                        value={tagsDraft}
                        onChange={(e) => setTagsDraft(e.target.value)}
                        placeholder="power-rule, chain-rule-basics"
                        className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-[13px] text-slate-900 placeholder-slate-400 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      />
                      <button
                        type="button"
                        disabled={pending}
                        onClick={onSaveTags}
                        className="inline-flex shrink-0 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white px-3.5 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      >
                        Save tags
                      </button>
                    </div>
                  </div>

                  {detail.status === "pending_review" ? (
                    <div className="flex flex-wrap gap-2 pt-2">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={onApprove}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-[13px] font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                      >
                        {pending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={onReject}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3.5 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </div>
                  ) : null}

                  {message ? (
                    <p role="status" className="text-[13px] text-slate-600">
                      {message}
                    </p>
                  ) : null}
                </div>
              ) : (
                <ItemReviewStudentPreview item={detail} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function QueueRow({
  item,
  active,
  onSelect,
}: {
  item: ItemReviewListItem;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "w-full text-left px-4 py-3 transition-colors",
          active ? "bg-slate-50" : "hover:bg-slate-50/70",
        )}
      >
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span>{itemFormatLabel(item.itemFormat)}</span>
          <span>·</span>
          <span>
            U{item.unitNumber} {item.nodeName}
          </span>
        </div>
        <p className="mt-1 text-[13px] text-slate-900 line-clamp-2">{truncatePrompt(item.prompt, 140)}</p>
      </button>
    </li>
  );
}
