import type { SupabaseClient } from "@supabase/supabase-js";

import { SUPABASE_URL } from "@/lib/env";

const FALLBACK_INITIALS = "?";
const FALLBACK_DISPLAY_NAME = "there";
const PROFILES_TABLE = "profiles";

const SUPABASE_ORIGIN = ((): string | null => {
    try {
        return new URL(SUPABASE_URL).origin;
    } catch {
        return null;
    }
})();

export const safeAvatarUrl = (raw: string | null): string | null => {
    if (raw === null || SUPABASE_ORIGIN === null) {
        return null;
    }

    try {
        return new URL(raw).origin === SUPABASE_ORIGIN ? raw : null;
    } catch {
        return null;
    }
};

export type ProfileAddress = {
    line1: string | null;
    line2: string | null;
    city: string | null;
    postalCode: string | null;
    country: string | null;
};

export type Profile = {
    firstName: string | null;
    lastName: string | null;
    displayName: string | null;
    affiliation: string | null;
    institution: string | null;
    role: string | null;
    avatarUrl: string | null;
    address: ProfileAddress;
};

export const EMPTY_PROFILE: Profile = {
    firstName: null,
    lastName: null,
    displayName: null,
    affiliation: null,
    institution: null,
    role: null,
    avatarUrl: null,
    address: {
        line1: null,
        line2: null,
        city: null,
        postalCode: null,
        country: null,
    },
};

type ProfileRow = {
    first_name: string | null;
    last_name: string | null;
    display_name: string | null;
    institution: string | null;
    affiliation: string | null;
    role: string | null;
    avatar_url: string | null;
    address_line1: string | null;
    address_line2: string | null;
    city: string | null;
    postal_code: string | null;
    country: string | null;
};

const trimOrNull = (value: string | null): string | null => {
    if (value === null) {
        return null;
    }

    const trimmed = value.trim();

    return trimmed === "" ? null : trimmed;
};

const profileFromRow = (row: ProfileRow): Profile => {
    return {
        firstName: trimOrNull(row.first_name),
        lastName: trimOrNull(row.last_name),
        displayName: trimOrNull(row.display_name),
        affiliation: trimOrNull(row.affiliation),
        institution: trimOrNull(row.institution),
        role: trimOrNull(row.role),
        avatarUrl: safeAvatarUrl(trimOrNull(row.avatar_url)),
        address: {
            line1: trimOrNull(row.address_line1),
            line2: trimOrNull(row.address_line2),
            city: trimOrNull(row.city),
            postalCode: trimOrNull(row.postal_code),
            country: trimOrNull(row.country),
        },
    };
};

export const loadProfile = async (
    supabase: SupabaseClient,
    userId: string,
): Promise<Profile> => {
    const { data, error } = await supabase
        .from(PROFILES_TABLE)
        .select(
            "first_name, last_name, display_name, institution, affiliation, role, avatar_url, address_line1, address_line2, city, postal_code, country",
        )
        .eq("id", userId)
        .maybeSingle<ProfileRow>();

    if (error !== null) {
        console.error("[loadProfile] failed to fetch profile", { userId, error });

        return EMPTY_PROFILE;
    }

    if (data === null) {
        return EMPTY_PROFILE;
    }

    return profileFromRow(data);
};

export const initialsFromNameOrEmail = (value: string): string => {
    const trimmed = value.trim();

    if (trimmed === "") {
        return FALLBACK_INITIALS;
    }

    if (trimmed.includes("@")) {
        const local = trimmed.split("@")[0] ?? "";
        if (local === "") {
            return FALLBACK_INITIALS;
        }

        return local.slice(0, 2).toUpperCase();
    }

    const parts = trimmed.split(/\s+/).filter((part) => part.length > 0);
    if (parts.length === 0) {
        return FALLBACK_INITIALS;
    }
    if (parts.length === 1) {
        return parts[0]!.slice(0, 2).toUpperCase();
    }

    const first = parts[0]![0] ?? "";
    const last = parts[parts.length - 1]![0] ?? "";

    return (first + last).toUpperCase();
};

const localPartFromEmail = (email: string | null): string | null => {
    if (email === null || email === "") {
        return null;
    }

    const local = email.split("@")[0];

    return local !== undefined && local !== "" ? local : null;
};

export const displayNameFor = (profile: Profile, email: string | null): string => {
    if (profile.displayName !== null) {
        return profile.displayName;
    }
    if (profile.firstName !== null && profile.lastName !== null) {
        return `${profile.firstName} ${profile.lastName}`;
    }
    if (profile.firstName !== null) {
        return profile.firstName;
    }

    return localPartFromEmail(email) ?? FALLBACK_DISPLAY_NAME;
};

export const greetingNameFor = (profile: Profile, email: string | null): string => {
    if (profile.firstName !== null) {
        return profile.firstName;
    }
    if (profile.displayName !== null) {
        return profile.displayName;
    }

    return localPartFromEmail(email) ?? FALLBACK_DISPLAY_NAME;
};

export const greetingByHour = (hour: number): string => {
    if (hour < 12) {
        return "Good morning";
    }
    if (hour < 18) {
        return "Good afternoon";
    }

    return "Good evening";
};
