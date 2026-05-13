/**
 * Real network call. Run with a configured gateway, e.g.:
 * `node --env-file=.env.local --import tsx scripts/smoke-recommend.ts`
 */
import { recommendChart } from "../src/lib/ai/recommendChart";

const ms = 15_000;

async function main(): Promise<void> {
    const started = Date.now();

    try {
        const result = await Promise.race([
            recommendChart({
                columns: [
                    {
                        name: "time_days",
                        nullCount: 0,
                        primaryType: "numeric",
                        uniqueCount: 120,
                    },
                    {
                        name: "event_flg",
                        nullCount: 0,
                        primaryType: "binary",
                        uniqueCount: 2,
                    },
                    {
                        name: "arm_lbl",
                        nullCount: 0,
                        primaryType: "categorical",
                        uniqueCount: 2,
                    },
                ],
                intent: "compare survival between treatment arms",
                mapping: {
                    event: "event_flg",
                    group: "arm_lbl",
                    time: "time_days",
                },
            }),
            new Promise<never>((_, reject) => {
                setTimeout(() => {
                    reject(new Error(`smoke timeout after ${ms}ms`));
                }, ms);
            }),
        ]);

        const latencyMs = Date.now() - started;

        if (!result.ok) {
            console.error("FAIL", JSON.stringify(result, null, 2));
            process.exit(1);
        }

        if (result.chartType !== "km") {
            console.error("FAIL: expected chartType km, got", result.chartType);
            process.exit(1);
        }

        if (result.receipt.recommendation.because.trim() === "") {
            console.error("FAIL: empty receipt.recommendation.because");
            process.exit(1);
        }

        if (result.costEstimateEur >= 0.05) {
            console.error("FAIL: cost too high (€)", result.costEstimateEur);
            process.exit(1);
        }

        console.log(
            `PASS latencyMs=${latencyMs} costEur=${result.costEstimateEur.toFixed(4)} chartType=${result.chartType} (see server log for [ai] recommend token usage)`,
        );
    } catch (err) {
        console.error("FAIL", err);
        process.exit(1);
    }
}

void main();
