const requireEnv = (key: string): string => {
    const value = process.env[key];

    if (value === undefined || value === "") {
        throw new Error(`Missing required environment variable: ${key}`);
    }

    return value;
};

export const SUPABASE_URL: string = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
export const SUPABASE_PUBLISHABLE_KEY: string = requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
