import { REMOVED_QUEST_API_BODY } from "@/features/quest/quest-internal";

export const dynamic = "force-dynamic";

export async function POST() {
  return new Response(REMOVED_QUEST_API_BODY, {
    status: 410,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
