export type ActorKey = string & { readonly __brand: "ActorKey" };

export type RateLimitResult =
    | { readonly allowed: true; readonly recordId: number | null; readonly remaining: number }
    | { readonly allowed: false; readonly retryAfterSeconds: number };
