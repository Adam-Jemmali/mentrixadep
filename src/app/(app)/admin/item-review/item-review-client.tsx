"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  approveAllPending,
  approveItem,
  rejectItem,
  type ItemBankCandidate,
  type ReviewNodeGroup,
  type ReviewNodeSummary,
  type ReviewQueueStats,
} from "@/features/admin/item-review/actions";
import { PromptWithMath } from "@/features/quest/ui/prompt-with-math";

interface ItemReviewClientProps {
  stats: ReviewQueueStats;
  nodeBreakdown: ReviewNodeSummary[];
  groups: ReviewNodeGroup[];
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex flex-col gap-0.5">
      <span className={`text-2xl font-semibold tracking-tight ${accent ?? "text-slate-900"}`}>
        {value}
      </span>
      <span className="text-xs text-slate-400 font-medium">{label}</span>
    </div>
  );
}

type EditState = {
  prompt: string;
  options: [string, string, string, string];
  explanation: string;
};

function ItemCard({
  item,
  onDone,
}: {
  item: ItemBankCandidate;
  onDone: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [editState, setEditState] = useState<EditState>(() => ({
    prompt: item.prompt,
    options: [
      item.options[0] ?? "",
      item.options[1] ?? "",
      item.options[2] ?? "",
      item.options[3] ?? "",
    ],
    explanation: item.explanation,
  }));

  const correctIndex = item.options.findIndex((opt) => opt === item.correct_answer);

  const approve = (withEdits: boolean) => {
    startTransition(async () => {
      try {
        setError(null);
        await approveItem(
          item.id,
          withEdits
            ? {
                prompt: editState.prompt,
                options: editState.options,
                explanation: editState.explanation,
              }
            : undefined
        );
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to approve");
      }
    });
  };

  const reject = () => {
    startTransition(async () => {
      try {
        setError(null);
        await rejectItem(item.id);
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to reject");
      }
    });
  };

  const displayOptions = editing ? editState.options : item.options;

  return (
    <div className="border border-slate-200 rounded-lg bg-white p-4 space-y-3">
      {editing ? (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Prompt</label>
            <textarea
              value={editState.prompt}
              onChange={(e) => setEditState((s) => ({ ...s, prompt: e.target.value }))}
              rows={3}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 text-slate-700"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600 block">Options</label>
            {editState.options.map((option, index) => {
              const isCorrect = index === correctIndex;
              return (
                <textarea
                  key={index}
                  value={option}
                  onChange={(e) => {
                    const next = [...editState.options] as EditState["options"];
                    next[index] = e.target.value;
                    setEditState((s) => ({ ...s, options: next }));
                  }}
                  rows={2}
                  className={`w-full text-sm border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 text-slate-700 ${
                    isCorrect
                      ? "border-emerald-300 bg-emerald-50 focus:ring-emerald-500/20 focus:border-emerald-400"
                      : "border-slate-200 focus:ring-slate-300"
                  }`}
                />
              );
            })}
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Explanation</label>
            <textarea
              value={editState.explanation}
              onChange={(e) => setEditState((s) => ({ ...s, explanation: e.target.value }))}
              rows={3}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 text-slate-700"
            />
          </div>
        </div>
      ) : (
        <>
          <PromptWithMath text={item.prompt} />
          <ul className="space-y-1.5">
            {displayOptions.map((option, index) => {
              const isCorrect = option === item.correct_answer;
              return (
                <li
                  key={`${item.id}-opt-${index}`}
                  className={`text-sm px-3 py-2 rounded-md border ${
                    isCorrect
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800 font-medium"
                      : "border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  <PromptWithMath text={option} />
                </li>
              );
            })}
          </ul>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-xs text-slate-400 block mb-1">Explanation</span>
            <PromptWithMath text={item.explanation} />
          </div>
          {Object.keys(item.distractor_tags).length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <span className="text-xs text-amber-700 block mb-1">Distractor tags</span>
              <ul className="space-y-2">
                {Object.entries(item.distractor_tags).map(([option, tag], index) => (
                  <li key={`${item.id}-tag-${index}`} className="text-xs text-slate-700 space-y-0.5">
                    <PromptWithMath text={`${option}:`} />
                    <PromptWithMath text={tag} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {editing ? (
          <>
            <button
              type="button"
              onClick={() => approve(true)}
              disabled={isPending}
              className="px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors disabled:opacity-60"
            >
              {isPending ? "Saving..." : "Save and approve"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setEditState({
                  prompt: item.prompt,
                  options: [
                    item.options[0] ?? "",
                    item.options[1] ?? "",
                    item.options[2] ?? "",
                    item.options[3] ?? "",
                  ],
                  explanation: item.explanation,
                });
              }}
              disabled={isPending}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Cancel edit
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => approve(false)}
              disabled={isPending}
              className="px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors disabled:opacity-60"
            >
              {isPending ? "Approving..." : "Approve"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(true)}
              disabled={isPending}
              className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors disabled:opacity-60"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={reject}
              disabled={isPending}
              className="px-3 py-1.5 text-xs font-medium bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-md transition-colors disabled:opacity-60"
            >
              {isPending ? "Rejecting..." : "Reject"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function ItemReviewClient({ stats, nodeBreakdown, groups }: ItemReviewClientProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [isBulkPending, startBulkTransition] = useTransition();

  const handleDone = useCallback(() => {
    startTransition(() => {
      router.refresh();
    });
  }, [router]);

  const handleBulkApprove = () => {
    startBulkTransition(async () => {
      try {
        setBulkError(null);
        await approveAllPending();
        setBulkOpen(false);
        handleDone();
      } catch (e) {
        setBulkError(e instanceof Error ? e.message : "Bulk approve failed");
      }
    });
  };

  const belowTargetCount = useMemo(
    () => nodeBreakdown.filter((node) => node.below_target).length,
    [nodeBreakdown]
  );

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-slate-900">
              Item Review Queue
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              AP Calculus AB item bank · Goal: at least 3 approved items per skill node
            </p>
          </div>
          {stats.pending > 0 && (
            <button
              type="button"
              onClick={() => {
                setBulkError(null);
                setBulkOpen(true);
              }}
              className="px-4 py-2 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shrink-0"
            >
              Approve all pending ({stats.pending})
            </button>
          )}
        </div>
      </div>

      {bulkOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={() => !isBulkPending && setBulkOpen(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-2xl shadow-slate-900/10 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900">Approve all pending items</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  This will approve {stats.pending} AP Calculus AB items without edits.
                </p>
              </div>
              <div className="px-5 py-4">
                <p className="text-sm text-slate-600">
                  Approved items become visible to students via the item bank. This action cannot be
                  undone from this page.
                </p>
                {bulkError && <p className="text-xs text-red-500 mt-3">{bulkError}</p>}
              </div>
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBulkOpen(false)}
                  disabled={isBulkPending}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkApprove}
                  disabled={isBulkPending}
                  className="px-4 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-60"
                >
                  {isBulkPending ? "Approving..." : `Approve ${stats.pending} items`}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="mb-4 p-4 bg-white border border-slate-200 rounded-lg">
        <p className="text-sm text-slate-700">
          <span className="font-semibold text-emerald-600">{stats.approved}</span> approved,{" "}
          <span className="font-semibold text-amber-600">{stats.pending}</span> pending,{" "}
          <span className="font-semibold text-rose-600">{stats.rejected}</span> rejected for AP
          Calculus AB
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="Approved" value={stats.approved} accent="text-emerald-600" />
        <StatCard label="Pending review" value={stats.pending} accent="text-amber-600" />
        <StatCard label="Rejected" value={stats.rejected} accent="text-rose-600" />
      </div>

      <div className="mb-6 bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Per node coverage</h2>
          {belowTargetCount > 0 && (
            <span className="text-xs font-medium text-orange-600">
              {belowTargetCount} nodes below 3 approved
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="py-2.5 px-4 text-left text-xs font-medium text-slate-500">Unit</th>
                <th className="py-2.5 px-4 text-left text-xs font-medium text-slate-500">Node</th>
                <th className="py-2.5 px-4 text-left text-xs font-medium text-slate-500">Approved</th>
              </tr>
            </thead>
            <tbody>
              {nodeBreakdown.map((node) => (
                <tr key={node.skill_node_id} className="border-b border-slate-100 last:border-b-0">
                  <td className="py-2.5 px-4 text-xs text-slate-500">
                    U{node.unit_number} · {node.unit_name}
                  </td>
                  <td className="py-2.5 px-4 text-sm text-slate-900">{node.node_name}</td>
                  <td className="py-2.5 px-4">
                    <span
                      className={`text-sm font-semibold ${
                        node.below_target ? "text-orange-600" : "text-emerald-600"
                      }`}
                    >
                      {node.approved_count}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="py-16 text-center border border-slate-200 rounded-xl bg-white">
          <p className="text-sm text-slate-400">No items pending review.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.skill_node_id} className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Unit {group.unit_number}: {group.unit_name}
                  </h2>
                  <p className="text-sm text-slate-600 mt-0.5">{group.node_name}</p>
                </div>
                <div className="text-xs text-slate-400 shrink-0">
                  {group.approved_count} approved · {group.pending_count} pending
                </div>
              </div>
              <div className="space-y-3">
                {group.items.map((item) => (
                  <ItemCard key={item.id} item={item} onDone={handleDone} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
