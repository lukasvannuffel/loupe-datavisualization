import { checkBotId } from "botid/server";

const BOT_BLOCKED_MESSAGE = "Request blocked. Please refresh the page and try again.";

export type BotGuardResult =
    | { ok: true }
    | { ok: false; error: string };

export const verifyHuman = async (): Promise<BotGuardResult> => {
    try {
        const verdict = await checkBotId();

        if (verdict.isBot) {
            return { ok: false, error: BOT_BLOCKED_MESSAGE };
        }

        return { ok: true };
    } catch (error) {
        // Fail open on infra failures (Vercel BotID API down, network blip)
        // so legitimate users are never locked out by upstream issues.
        // Log so operators can correlate spikes with outages.
        console.error("[bot-guard] checkBotId failed; allowing request", error);

        return { ok: true };
    }
};
