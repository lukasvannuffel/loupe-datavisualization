import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";

const POST_AUTH_DEFAULT = "/dashboard";
const SAFE_NEXT_PATTERN = /^\/(?![/\\])[\w\-./?#=&%]*$/;

const safeNextPath = (raw: string | null): string => {
    if (raw === null || !SAFE_NEXT_PATTERN.test(raw)) {
        return POST_AUTH_DEFAULT;
    }

    return raw;
};

export const dynamic = "force-dynamic";

const readOAuthIdentityString = (user: User, key: string): string | null => {
    const raw = user.user_metadata?.[key];
    if (typeof raw !== "string") {
        return null;
    }

    const trimmed = raw.trim();

    return trimmed === "" ? null : trimmed;
};

type ProfileMirror = {
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
};

const buildOauthMirror = (user: User): ProfileMirror => {
    const updates: ProfileMirror = {};

    const givenName = readOAuthIdentityString(user, "given_name");
    if (givenName !== null) {
        updates.first_name = givenName;
    }

    const familyName = readOAuthIdentityString(user, "family_name");
    if (familyName !== null) {
        updates.last_name = familyName;
    }

    const picture = readOAuthIdentityString(user, "picture");
    if (picture !== null) {
        updates.avatar_url = picture;
    }

    return updates;
};

export const GET = async (request: Request): Promise<NextResponse> => {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const next = safeNextPath(searchParams.get("next"));

    if (code === null) {
        return NextResponse.redirect(`${origin}/auth?error=oauth`);
    }

    const supabase = createClient(await cookies());
    const { data: exchange, error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError !== null || exchange.user === null) {
        return NextResponse.redirect(`${origin}/auth?error=oauth`);
    }

    // First-time OAuth: mirror Google profile fields into our `profiles` table,
    // but only fill empty columns. Manual edits in /account are preserved.
    const mirror = buildOauthMirror(exchange.user);
    const mirrorKeys = Object.keys(mirror) as Array<keyof ProfileMirror>;

    if (mirrorKeys.length > 0) {
        const { data: existing } = await supabase
            .from("profiles")
            .select("first_name, last_name, avatar_url")
            .eq("id", exchange.user.id)
            .maybeSingle<{
                first_name: string | null;
                last_name: string | null;
                avatar_url: string | null;
            }>();

        const fillIfEmpty: ProfileMirror = {};
        if (mirror.first_name !== undefined && (existing?.first_name ?? null) === null) {
            fillIfEmpty.first_name = mirror.first_name;
        }
        if (mirror.last_name !== undefined && (existing?.last_name ?? null) === null) {
            fillIfEmpty.last_name = mirror.last_name;
        }
        if (mirror.avatar_url !== undefined && (existing?.avatar_url ?? null) === null) {
            fillIfEmpty.avatar_url = mirror.avatar_url;
        }

        if (Object.keys(fillIfEmpty).length > 0) {
            await supabase
                .from("profiles")
                .upsert({
                    id: exchange.user.id,
                    ...fillIfEmpty,
                    updated_at: new Date().toISOString(),
                });
        }
    }

    return NextResponse.redirect(`${origin}${next}`);
};
