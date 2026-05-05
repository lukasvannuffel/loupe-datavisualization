import { createServerClient } from "@supabase/ssr";
import type { cookies } from "next/headers";

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/env";

type CookieStore = Awaited<ReturnType<typeof cookies>>;

export const createClient = (cookieStore: CookieStore): ReturnType<typeof createServerClient> => {
    return createServerClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options),
                        );
                    } catch {
                        // setAll was called from a Server Component; safe to ignore
                        // because Proxy refreshes the session cookies.
                    }
                },
            },
        },
    );
};
