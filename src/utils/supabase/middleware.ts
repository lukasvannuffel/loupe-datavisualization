import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/env";

const PROTECTED_PREFIXES: readonly string[] = [
    "/upload",
    "/recommend",
    "/export",
    "/dashboard",
    "/library",
    "/project",
    "/account",
];

const isProtectedPath = (pathname: string): boolean => {
    return PROTECTED_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
};

export const updateSession = async (request: NextRequest): Promise<NextResponse> => {
    let supabaseResponse = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value),
                    );
                    supabaseResponse = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options),
                    );
                },
            },
        },
    );

    // Do not insert code between createServerClient and getUser().
    // getUser() triggers the setAll callback above, which is what actually
    // refreshes the auth cookies on the outgoing response.
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const pathname = request.nextUrl.pathname;

    if (user === null && isProtectedPath(pathname)) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/auth";
        redirectUrl.search = "";

        return NextResponse.redirect(redirectUrl);
    }

    if (user !== null && pathname === "/auth") {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/dashboard";
        redirectUrl.search = "";

        return NextResponse.redirect(redirectUrl);
    }

    return supabaseResponse;
};
