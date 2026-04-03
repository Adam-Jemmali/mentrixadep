/**
 * Supabase Edge Function — send Web Push using `push_subscriptions` + VAPID.
 * Deploy: `supabase functions deploy send-web-push`
 * Secrets: VAPID_PRIVATE_KEY (and match NEXT_PUBLIC_VAPID_PUBLIC_KEY in the Next.js app).
 */
declare const Deno: { serve(handler: (req: Request) => Promise<Response> | Response): void };

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  return new Response(
    JSON.stringify({
      ok: true,
      message:
        "Stub: implement encrypted push (e.g. web-push) using rows from public.push_subscriptions.",
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
