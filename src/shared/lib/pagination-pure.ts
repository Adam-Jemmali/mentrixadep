export function paginateRows<T>(rows: T[], page: number, pageSize: number): T[] {
  const { safePage } = paginationMeta(rows.length, page, pageSize);
  const start = (safePage - 1) * pageSize;
  return rows.slice(start, start + pageSize);
}

export function paginationMeta(totalItems: number, page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, totalItems);
  return { totalPages, safePage, start, end, totalItems };
}

export function buildPaginationPageNumbers(
  page: number,
  totalPages: number,
): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages: (number | "ellipsis")[] = [1];

  if (page > 3) {
    pages.push("ellipsis");
  }

  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (page < totalPages - 2) {
    pages.push("ellipsis");
  }

  pages.push(totalPages);
  return pages;
}
