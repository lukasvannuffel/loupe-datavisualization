import type { User } from "@supabase/supabase-js";

import { SUPABASE_URL } from "@/lib/env";

const FALLBACK_INITIALS = "?";
const FALLBACK_DISPLAY_NAME = "there";

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

const readMetadataString = (user: User, key: string): string | null => {
    const raw = user.user_metadata?.[key];
    if (typeof raw !== "string") {
        return null;
    }

    const trimmed = raw.trim();
    if (trimmed === "") {
        return null;
    }

    return trimmed;
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

export const profileFromUser = (user: User): Profile => {
    return {
        firstName: readMetadataString(user, "first_name"),
        lastName: readMetadataString(user, "last_name"),
        displayName: readMetadataString(user, "display_name"),
        affiliation: readMetadataString(user, "affiliation"),
        institution: readMetadataString(user, "institution"),
        role: readMetadataString(user, "role"),
        avatarUrl: safeAvatarUrl(readMetadataString(user, "avatar_url")),
        address: {
            line1: readMetadataString(user, "address_line1"),
            line2: readMetadataString(user, "address_line2"),
            city: readMetadataString(user, "city"),
            postalCode: readMetadataString(user, "postal_code"),
            country: readMetadataString(user, "country"),
        },
    };
};

export const displayNameFromUser = (user: User): string => {
    const explicit = readMetadataString(user, "display_name");
    if (explicit !== null) {
        return explicit;
    }

    const first = readMetadataString(user, "first_name");
    const last = readMetadataString(user, "last_name");
    if (first !== null && last !== null) {
        return `${first} ${last}`;
    }
    if (first !== null) {
        return first;
    }

    if (user.email !== undefined && user.email !== "") {
        const local = user.email.split("@")[0];
        if (local !== undefined && local !== "") {
            return local;
        }
    }

    return FALLBACK_DISPLAY_NAME;
};

export const greetingNameFromUser = (user: User): string => {
    const first = readMetadataString(user, "first_name");
    if (first !== null) {
        return first;
    }

    const explicit = readMetadataString(user, "display_name");
    if (explicit !== null) {
        return explicit;
    }

    if (user.email !== undefined && user.email !== "") {
        const local = user.email.split("@")[0];
        if (local !== undefined && local !== "") {
            return local;
        }
    }

    return FALLBACK_DISPLAY_NAME;
};

export const affiliationFromUser = (user: User): string | null => {
    return readMetadataString(user, "affiliation");
};

export const avatarUrlFromUser = (user: User): string | null => {
    return safeAvatarUrl(readMetadataString(user, "avatar_url"));
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
