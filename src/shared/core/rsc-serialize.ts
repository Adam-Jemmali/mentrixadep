/**
 * Ensure a value can be sent from Server Components to Client Components.
 * Supabase / Postgres can surface `bigint`; `JSON.stringify` throws on bigint and breaks RSC.
 */
export function sanitizeForRsc<T>(value: T): T {
  const seen = new WeakMap<object, unknown>();

  const walk = (input: unknown): unknown => {
    if (input == null) return input;
    if (typeof input === "bigint") {
      const n = Number(input);
      return Number.isSafeInteger(n) ? n : input.toString();
    }
    if (
      typeof input === "string" ||
      typeof input === "number" ||
      typeof input === "boolean"
    ) {
      return input;
    }
    if (input instanceof Date) {
      return input.toISOString();
    }
    if (Array.isArray(input)) {
      return input.map((x) => walk(x));
    }
    if (typeof input === "object") {
      const obj = input as Record<string, unknown>;
      if (seen.has(obj)) return seen.get(obj);
      const out: Record<string, unknown> = {};
      seen.set(obj, out);
      for (const [k, v] of Object.entries(obj)) {
        if (typeof v === "function" || typeof v === "symbol") continue;
        out[k] = walk(v);
      }
      return out;
    }
    return null;
  };

  return walk(value) as T;
}
