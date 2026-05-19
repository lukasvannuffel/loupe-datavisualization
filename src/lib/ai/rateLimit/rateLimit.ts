import { createSupabaseAdminClient } from "@/utils/supabase/admin";

import type { ActorKey } from "./rateLimit.types";
import type { RateLimitResult } from "./rateLimit.types";

const WINDOW_MS = 60 * 60 * 1000;
const LIMIT = 20;

export const checkAndRecord = async (actorKey: ActorKey): Promise<RateLimitResult> => {
    const supabase = createSupabaseAdminClient();
    const since = new Date(Date.now() - WINDOW_MS).toISOString();

    const { data: recent, error: countError } = await supabase
        .from("ai_rate_limits")
        .select("called_at")
        .eq("actor_key", actorKey)
        .gte("called_at", since)
        .order("called_at", { ascending: true });

    if (countError) {
        // Fail open: do not block recommendations when Supabase is unavailable.
        // The Vercel AI Gateway monthly $ cap is the absolute backstop.
        console.error("[ai] rate limit query failed", countError);

        return { allowed: true, remaining: LIMIT };
    }

    const count = recent?.length ?? 0;

    if (count >= LIMIT) {
        const oldest = new Date(recent![0]!.called_at).getTime();
        const retryAfterSeconds = Math.max(1, Math.ceil((oldest + WINDOW_MS - Date.now()) / 1000));

        return { allowed: false, retryAfterSeconds };
    }

    const { error: insertError } = await supabase.from("ai_rate_limits").insert({ actor_key: actorKey });

    if (insertError) {
        console.error("[ai] rate limit insert failed", insertError);
    }

    return { allowed: true, remaining: LIMIT - count - 1 };
};
