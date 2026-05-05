import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

import { SUPABASE_URL } from "@/lib/env";

// Server-only. NEVER import this from a Client Component.
// The service-role key bypasses RLS — callers must verify the user
// via the cookie-authed server client BEFORE invoking admin operations,
// and constrain any storage paths to the verified user's folder.

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const createAdminClient = (): SupabaseClient => {
    if (SERVICE_ROLE_KEY === undefined || SERVICE_ROLE_KEY === "") {
        throw new Error("Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY");
    }

    return createSupabaseClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
};
