"use client";

import { Pagination } from "@/shared/ui/pagination";
import { MentrixaBrandMark } from "@/shared/ui/mentrixa-ui-brand";
import {
  buildPaginationPageNumbers,
  paginationMeta,
} from "@/shared/lib/pagination-pure";

export function MentrixaTablePagination({
  page,
  totalItems,
  pageSize,
  onPageChange,
  noun = "results",
  size = "sm",
  className,
}: {
  page: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  noun?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { totalPages, safePage, start, end } = paginationMeta(totalItems, page, pageSize);
  const pageNumbers = buildPaginationPageNumbers(safePage, totalPages);

  if (totalItems === 0) {
    return (
      <p className="text-xs text-slate-500">No {noun} on this view.</p>
    );
  }

  return (
    <Pagination className={className ?? "w-full"} size={size}>
      <Pagination.Summary className="inline-flex items-center gap-2">
        <MentrixaBrandMark kind="mentrixa" size="xs" className="opacity-70" />
        <span>
          {start} to {end} of {totalItems} {noun}
        </span>
      </Pagination.Summary>
      <Pagination.Content>
        <Pagination.Item>
          <Pagination.Previous
            isDisabled={safePage <= 1}
            onPress={() => onPageChange(safePage - 1)}
          >
            <Pagination.PreviousIcon />
            <span>Prev</span>
          </Pagination.Previous>
        </Pagination.Item>
        {pageNumbers.map((p, index) =>
          p === "ellipsis" ? (
            <Pagination.Item key={`ellipsis-${index}`}>
              <Pagination.Ellipsis />
            </Pagination.Item>
          ) : (
            <Pagination.Item key={p}>
              <Pagination.Link
                isActive={p === safePage}
                onPress={() => onPageChange(p)}
              >
                {p}
              </Pagination.Link>
            </Pagination.Item>
          ),
        )}
        <Pagination.Item>
          <Pagination.Next
            isDisabled={safePage >= totalPages}
            onPress={() => onPageChange(safePage + 1)}
          >
            <span>Next</span>
            <Pagination.NextIcon />
          </Pagination.Next>
        </Pagination.Item>
      </Pagination.Content>
    </Pagination>
  );
}
