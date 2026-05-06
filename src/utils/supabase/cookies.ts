import type { CookieOptions } from "@supabase/ssr";

const SUPABASE_AUTH_COOKIE_PREFIX = "sb-";
const isProduction = process.env.NODE_ENV === "production";

const isSupabaseAuthCookie = (name: string): boolean => {
    return name.startsWith(SUPABASE_AUTH_COOKIE_PREFIX);
};

export const hardenSupabaseCookieOptions = (
    name: string,
    options: CookieOptions | undefined,
): CookieOptions => {
    const base: CookieOptions = options ?? {};

    if (!isSupabaseAuthCookie(name)) {
        return base;
    }

    return {
        ...base,
        httpOnly: true,
        sameSite: "lax",
        secure: isProduction,
        path: "/",
    };
};
