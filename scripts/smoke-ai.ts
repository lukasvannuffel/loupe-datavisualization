/** Not a unit test. Real network call. Run via `npm run smoke:ai` after deploy or locally with .env.local set. */
const url = process.env.LOUPE_PING_URL ?? "http://localhost:3000/api/ai/ping";

async function main(): Promise<void> {
    const started = Date.now();
    let response: Response;
    try {
        response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
            console.error("TIMEOUT after 15s — server may be wedged");
            process.exit(1);
        }
        console.error("FAIL: fetch error", err);
        process.exit(1);
    }
    const latencyMs = Date.now() - started;
    const rawText = await response.text();
    if (response.status !== 200) {
        console.error(`status=${response.status} latencyMs=${latencyMs}`);
        console.error("body(raw)=", rawText);
        try {
            console.error("body(parsed)=", JSON.parse(rawText));
        } catch {
            /* raw already printed */
        }
        process.exit(1);
    }
    let parsed: unknown;
    try {
        parsed = JSON.parse(rawText);
    } catch {
        console.error(`status=${response.status} latencyMs=${latencyMs} invalid JSON`);
        console.error("body(raw)=", rawText);
        process.exit(1);
    }
    const ok =
        typeof parsed === "object" &&
        parsed !== null &&
        "ok" in parsed &&
        parsed.ok === true &&
        "response" in parsed &&
        typeof (parsed as { response: unknown }).response === "string" &&
        (parsed as { response: string }).response.toLowerCase().includes("pong");
    if (!ok) {
        console.error("unexpected body:", JSON.stringify(parsed, null, 2));
        process.exit(1);
    }
    const payload = parsed as { readonly model?: unknown };
    const model = typeof payload.model === "string" ? payload.model : "?";
    console.log(`PASS (${latencyMs}ms, model=${model})`);
}

void main();
