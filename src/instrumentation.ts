export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

type RequestErrorContext = {
  routerKind: "Pages Router" | "App Router";
  routePath: string;
  routeType: "render" | "route" | "action" | "middleware";
  revalidateReason?: "on-demand" | "stale";
};

export async function onRequestError(
  error: { digest: string } & Error,
  request: {
    path: string;
    method: string;
    headers: { [key: string]: string };
  },
  context: RequestErrorContext,
): Promise<void> {
  const Sentry = await import("@sentry/nextjs");
  const capture = (
    Sentry as typeof Sentry & {
      captureRequestError?: (
        err: typeof error,
        req: typeof request,
        ctx: RequestErrorContext,
      ) => void;
    }
  ).captureRequestError;
  capture?.(error, request, context);
}
