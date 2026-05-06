// Read public env vars via *literal* property access so Next's bundler can
// statically inline them into both server and client bundles. Dynamic access
// (process.env[key]) is NOT replaced and breaks client-side imports.

const SUPABASE_URL_RAW = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY_RAW = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SITE_URL_RAW = process.env.NEXT_PUBLIC_SITE_URL;

if (SUPABASE_URL_RAW === undefined || SUPABASE_URL_RAW === "") {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL");
}

if (SUPABASE_PUBLISHABLE_KEY_RAW === undefined || SUPABASE_PUBLISHABLE_KEY_RAW === "") {
    throw new Error(
        "Missing required environment variable: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
}

const normalizeOrigin = (raw: string): string | null => {
    try {
        return new URL(raw).origin;
    } catch {
        return null;
    }
};

export const SUPABASE_URL: string = SUPABASE_URL_RAW;
export const SUPABASE_PUBLISHABLE_KEY: string = SUPABASE_PUBLISHABLE_KEY_RAW;
export const SITE_URL: string | null =
    SITE_URL_RAW !== undefined && SITE_URL_RAW !== ""
        ? normalizeOrigin(SITE_URL_RAW)
        : null;
