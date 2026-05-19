import { createHash } from "node:crypto";

import { cookies, headers } from "next/headers";

import { createClient } from "@/utils/supabase/server";

import type { ActorKey } from "./rateLimit.types";

const SALT_ENV = "RATE_LIMIT_SALT";

const hashIp = (ip: string): ActorKey => {
    const salt = process.env[SALT_ENV];

    if (!salt) {
        throw new Error(`${SALT_ENV} is not set. See docs/AI_GATEWAY_SETUP.md.`);
    }

    return createHash("sha256").update(salt).update(ip).digest("hex") as ActorKey;
};

export const resolveActorKey = async (): Promise<ActorKey> => {
    try {
        const supabase = createClient(await cookies());
        const { data } = await supabase.auth.getUser();

        if (data.user) {
            return `user:${data.user.id}` as ActorKey;
        }
    } catch {
        // Supabase unavailable — fall through to IP hashing.
    }

    const headerStore = await headers();
    const xff = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim();
    const xri = headerStore.get("x-real-ip")?.trim();
    const ip = xff || xri || "unknown";

    return hashIp(ip);
};
