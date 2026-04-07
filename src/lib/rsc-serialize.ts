/**
 * Ensure a value can be sent from Server Components to Client Components.
 * Supabase / Postgres can surface `bigint`; `JSON.stringify` throws on bigint and breaks RSC.
 */
export function sanitizeForRsc<T>(value: T): T {
  try {
    return JSON.parse(
      JSON.stringify(value, (_key, v) => {
        if (typeof v === "bigint") {
          const n = Number(v);
          return Number.isSafeInteger(n) ? n : v.toString();
        }
        return v;
      }),
    ) as T;
  } catch (e) {
    console.error("[rsc-serialize] failed to sanitize payload:", e);
    throw e;
  }
}
