import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";

const POST_AUTH_DEFAULT = "/dashboard";

const readMetadataString = (user: User, key: string): string | null => {
    const raw = user.user_metadata?.[key];
    if (typeof raw !== "string") {
        return null;
    }

    const trimmed = raw.trim();

    return trimmed === "" ? null : trimmed;
};

const buildOauthMirror = (user: User): Record<string, string> => {
    const updates: Record<string, string> = {};

    if (readMetadataString(user, "first_name") === null) {
        const givenName = readMetadataString(user, "given_name");
        if (givenName !== null) {
            updates.first_name = givenName;
        }
    }

    if (readMetadataString(user, "last_name") === null) {
        const familyName = readMetadataString(user, "family_name");
        if (familyName !== null) {
            updates.last_name = familyName;
        }
    }

    if (readMetadataString(user, "avatar_url") === null) {
        const picture = readMetadataString(user, "picture");
        if (picture !== null) {
            updates.avatar_url = picture;
        }
    }

    return updates;
};

export const GET = async (request: Request): Promise<NextResponse> => {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const next = searchParams.get("next") ?? POST_AUTH_DEFAULT;

    if (code === null) {
        return NextResponse.redirect(`${origin}/auth?error=oauth`);
    }

    const supabase = createClient(await cookies());
    const { data: exchange, error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError !== null || exchange.user === null) {
        return NextResponse.redirect(`${origin}/auth?error=oauth`);
    }

    // First-time OAuth: mirror Google profile fields into our schema, but only
    // for fields that are still empty. Manual edits in /account are preserved.
    const updates = buildOauthMirror(exchange.user);
    if (Object.keys(updates).length > 0) {
        await supabase.auth.updateUser({ data: updates });
    }

    return NextResponse.redirect(`${origin}${next}`);
};
