import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/env";

import { hardenSupabaseCookieOptions } from "./cookies";

type CookieStore = Awaited<ReturnType<typeof cookies>>;

export const createClient = (cookieStore: CookieStore) => {
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
                            cookieStore.set(name, value, hardenSupabaseCookieOptions(name, options)),
                        );
                    } catch {
                        // setAll was called from a Server Component; safe to ignore
                        // because the proxy middleware refreshes the session cookies.
                    }
                },
            },
        },
    );
};

export const requireUser = async (): Promise<User> => {
    const supabase = createClient(await cookies());
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (user === null) {
        redirect("/auth");
    }

    return user;
};
