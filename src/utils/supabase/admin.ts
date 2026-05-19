import { createClient } from "@supabase/supabase-js";

import { SUPABASE_URL } from "@/lib/env";

export const createSupabaseAdminClient = () => {
    const serviceRoleKey =
        typeof process.env.SUPABASE_SERVICE_ROLE_KEY === "string"
            ? process.env.SUPABASE_SERVICE_ROLE_KEY.trim()
            : "";

    if (!serviceRoleKey) {
        throw new Error(
            "SUPABASE_SERVICE_ROLE_KEY is not set. See docs/AI_GATEWAY_SETUP.md.",
        );
    }

    return createClient(SUPABASE_URL, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
};
