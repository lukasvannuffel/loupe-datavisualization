import { createBrowserClient } from "@supabase/ssr";

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/env";

export const createClient = (): ReturnType<typeof createBrowserClient> =>
    createBrowserClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
