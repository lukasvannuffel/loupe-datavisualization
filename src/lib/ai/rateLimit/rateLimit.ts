import { createSupabaseAdminClient } from "@/utils/supabase/admin";

import type { ActorKey } from "./rateLimit.types";
import type { RateLimitResult } from "./rateLimit.types";

const WINDOW_MS = 60 * 60 * 1000;
const LIMIT = 20;
const TABLE = "ai_rate_limits";

export const checkAndRecord = async (actorKey: ActorKey): Promise<RateLimitResult> => {
    let supabase;

    try {
        supabase = createSupabaseAdminClient();
    } catch (err) {
        console.error("[ai] rate limit admin client unavailable", err);

        return { allowed: true, recordId: null, remaining: LIMIT };
    }

    const since = new Date(Date.now() - WINDOW_MS).toISOString();

    // Race condition: simultaneous requests can both pass the count check before either inserts.
    // Worst case is overshooting by a few calls under heavy concurrent load per actor.
    // Acceptable for our scale; Gateway cap is the backstop.
    const { data: recent, error: countError } = await supabase
        .from(TABLE)
        .select("called_at")
        .eq("actor_key", actorKey)
        .gte("called_at", since)
        .order("called_at", { ascending: true });

    if (countError) {
        // Fail open: do not block recommendations when Supabase is unavailable.
        // The Vercel AI Gateway monthly $ cap is the absolute backstop.
        console.error("[ai] rate limit query failed", countError);

        return { allowed: true, recordId: null, remaining: LIMIT };
    }

    const count = recent?.length ?? 0;

    if (count >= LIMIT) {
        const oldest = new Date(recent![0]!.called_at).getTime();
        const retryAfterSeconds = Math.max(1, Math.ceil((oldest + WINDOW_MS - Date.now()) / 1000));

        return { allowed: false, retryAfterSeconds };
    }

    // If select succeeds but insert consistently fails, the counter never rises and the limit
    // becomes unenforced. The Vercel AI Gateway hard cap is the absolute backstop in this scenario.
    const { data: inserted, error: insertError } = await supabase
        .from(TABLE)
        .insert({ actor_key: actorKey })
        .select("id")
        .single();

    if (insertError) {
        console.error("[ai] rate limit insert failed", insertError);
    }

    return { allowed: true, recordId: inserted?.id ?? null, remaining: LIMIT - count - 1 };
};

/**
 * Gives back a slot recorded by `checkAndRecord`, for calls that failed before the model generated anything.
 *
 * @param recordId - Row id returned by `checkAndRecord`; null when nothing was recorded.
 */
export const releaseSlot = async (recordId: number | null): Promise<void> => {
    if (recordId === null) {
        return;
    }

    try {
        const { error } = await createSupabaseAdminClient().from(TABLE).delete().eq("id", recordId);

        if (error) {
            console.error("[ai] rate limit release failed", error);
        }
    } catch (err) {
        console.error("[ai] rate limit admin client unavailable", err);
    }
};
