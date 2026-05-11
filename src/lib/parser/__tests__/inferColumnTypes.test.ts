import { describe, expect, expectTypeOf, it } from "vitest";

import { INFERENCE_SAMPLE_SIZE, inferColumnTypes } from "../inferColumnTypes";
import type { ColumnInference } from "../inference.types";
import { brandRows, type ParseResult } from "../types";

import { FIXTURES, type Fixture } from "./fixtures";

const padTo = <T,>(arr: readonly T[], length: number, fill: T): T[] => {
    const out = arr.slice();
    while (out.length < length) {
        out.push(fill);
    }

    return out;
};

const buildParseResult = (cols: readonly { name: string; values: readonly string[] }[]): ParseResult => {
    const len = cols.reduce((m, c) => Math.max(m, c.values.length), 0);
    const rawRows: Record<string, string>[] = [];
    for (let i = 0; i < len; i++) {
        const row: Record<string, string> = {};
        for (const c of cols) {
            const padded = padTo(c.values, len, "");
            row[c.name] = padded[i];
        }
        rawRows.push(row);
    }

    return {
        headers: cols.map((c) => c.name),
        rows: brandRows(rawRows),
        rowCount: len,
        fileName: "fixture.csv",
        sizeBytes: 0,
        sourceFormat: "csv",
    };
};

describe("inferColumnTypes — acceptance criterion (LOUPE-03)", () => {
    it("classifies the patient-data quartet correctly", () => {
        const result = inferColumnTypes(
            buildParseResult([
                {
                    name: "id",
                    values: ["P001", "P002", "P003", "P004", "P005", "P006", "P007", "P008"],
                },
                {
                    name: "time_to_event_months",
                    values: ["12.5", "8.3", "24.7", "6.2", "18.9", "30.1", "15.4", "9.7"],
                },
                {
                    name: "event_observed",
                    values: ["1", "0", "1", "1", "0", "0", "1", "0"],
                },
                {
                    name: "treatment_arm",
                    values: ["control", "low", "high", "control", "low", "high", "control", "low"],
                },
            ]),
        );

        const byName = new Map(result.map((c) => [c.name, c]));

        expect(byName.get("id")?.primaryType).toBe("categorical");
        expect(byName.get("id")?.semanticTag).toBe("patient-id");
        expect(byName.get("time_to_event_months")?.primaryType).toBe("numeric");
        expect(byName.get("time_to_event_months")?.semanticTag).toBe("time-to-event");
        expect(byName.get("event_observed")?.primaryType).toBe("binary");
        expect(byName.get("event_observed")?.semanticTag).toBe("event-status");
        expect(byName.get("treatment_arm")?.primaryType).toBe("categorical");
        expect(byName.get("treatment_arm")?.semanticTag).toBeUndefined();
    });

    it("demotes an integer-valued patient_id column to categorical (override rule)", () => {
        const result = inferColumnTypes(
            buildParseResult([
                {
                    name: "patient_id",
                    values: ["1001", "1002", "1003", "1004", "1005", "1006", "1007"],
                },
            ]),
        );
        const got = result[0];

        expect(got.semanticTag).toBe("patient-id");
        expect(got.primaryType).toBe("categorical");
        expect(got.primaryType).not.toBe("integer");
        expect(got.primaryType).not.toBe("numeric");
    });
});

describe("inferColumnTypes — sample-size cap", () => {
    it("throws if any column reads at index ≥ INFERENCE_SAMPLE_SIZE (3-column proxy regression)", () => {
        const total = 5000;
        const raw: Record<string, string>[] = [];
        for (let i = 0; i < total; i++) {
            raw.push({
                a: String(i),
                b: i < 800 ? `val_${i}` : "",
                c: i < 100 ? "" : `c_${i}`,
            });
        }
        const guarded = new Proxy(raw, {
            get(target, prop, receiver) {
                if (typeof prop === "string" && /^\d+$/.test(prop)) {
                    const i = Number(prop);
                    if (i >= INFERENCE_SAMPLE_SIZE) {
                        throw new Error(`Sample-cap breach: index ${i} ≥ ${INFERENCE_SAMPLE_SIZE}`);
                    }
                }

                return Reflect.get(target, prop, receiver);
            },
        });

        expect(() =>
            inferColumnTypes({
                headers: ["a", "b", "c"],
                rows: brandRows(guarded),
                rowCount: total,
                fileName: "big.csv",
                sizeBytes: 0,
                sourceFormat: "csv",
            }),
        ).not.toThrow();
    });
});

describe("inferColumnTypes — fixture corpus accuracy ≥ 90%", () => {
    it("matches expected primaryType for ≥ 90% of fixtures", () => {
        const result = inferColumnTypes(buildParseResult(FIXTURES));
        const byName = new Map(result.map((c) => [c.name, c]));
        let primaryHits = 0;
        const primaryMisses: string[] = [];

        for (const f of FIXTURES) {
            const got = byName.get(f.name);
            if (got?.primaryType === f.expected.primaryType) {
                primaryHits++;
            } else {
                primaryMisses.push(`${f.name}: expected ${f.expected.primaryType}, got ${got?.primaryType}`);
            }
        }
        const rate = primaryHits / FIXTURES.length;

        expect({ rate, misses: primaryMisses }).toMatchObject({ rate: expect.any(Number) });
        expect(rate).toBeGreaterThanOrEqual(0.9);
    });

    it("matches expected semanticTag for ≥ 90% of fixtures that expect one", () => {
        const result = inferColumnTypes(buildParseResult(FIXTURES));
        const byName = new Map(result.map((c) => [c.name, c]));
        const tagged: readonly Fixture[] = FIXTURES.filter((f) => f.expected.semanticTag !== undefined);
        let semanticHits = 0;
        const semanticMisses: string[] = [];

        for (const f of tagged) {
            const got = byName.get(f.name);
            if (got?.semanticTag === f.expected.semanticTag) {
                semanticHits++;
            } else {
                semanticMisses.push(`${f.name}: expected ${f.expected.semanticTag}, got ${got?.semanticTag}`);
            }
        }
        const rate = tagged.length === 0 ? 1 : semanticHits / tagged.length;

        expect({ rate, misses: semanticMisses }).toMatchObject({ rate: expect.any(Number) });
        expect(rate).toBeGreaterThanOrEqual(0.9);
    });
});

describe("inferColumnTypes — false-positive rate < 10% (LOUPE-03 acceptance)", () => {
    const FP_RATE_THRESHOLD = 0.1;

    it("primaryType false-positive rate stays below 10% over the corpus", () => {
        const result = inferColumnTypes(buildParseResult(FIXTURES));
        const byName = new Map(result.map((c) => [c.name, c]));
        const falsePositives: string[] = [];

        for (const f of FIXTURES) {
            const got = byName.get(f.name);
            if (got?.primaryType !== f.expected.primaryType) {
                falsePositives.push(`${f.name}: expected ${f.expected.primaryType}, got ${got?.primaryType}`);
            }
        }
        const fpRate = falsePositives.length / FIXTURES.length;

        expect(fpRate, `primaryType false positives: ${falsePositives.join(" | ")}`).toBeLessThan(FP_RATE_THRESHOLD);
    });

    it("semanticTag false-positive rate stays below 10% over negative fixtures", () => {
        const result = inferColumnTypes(buildParseResult(FIXTURES));
        const byName = new Map(result.map((c) => [c.name, c]));
        const negatives: readonly Fixture[] = FIXTURES.filter((f) => f.expected.semanticTag === undefined);
        const falsePositives: string[] = [];

        expect(negatives.length).toBeGreaterThan(0);

        for (const f of negatives) {
            const got = byName.get(f.name);
            if (got?.semanticTag !== undefined) {
                falsePositives.push(`${f.name}: expected no tag, got ${got.semanticTag}`);
            }
        }
        const fpRate = falsePositives.length / negatives.length;

        expect(fpRate, `semanticTag false positives: ${falsePositives.join(" | ")}`).toBeLessThan(FP_RATE_THRESHOLD);
    });
});

describe("inferColumnTypes — whitespace cells (N1 regression)", () => {
    it("does not infer high numeric confidence on whitespace-only cells (Number(' ') === 0)", () => {
        const result = inferColumnTypes(
            buildParseResult([
                { name: "blanks", values: ["   ", "  ", "    ", " ", "   "] },
            ]),
        );
        const got = result[0];
        expect(got.primaryType).toBe("categorical");
        expect(got.confidence).toBe(0.4);
        expect(got.reasons).toEqual(["column has no values"]);
        expect(got.nullCount).toBe(5);
    });
});

describe("inferColumnTypes — determinism", () => {
    it("returns the same output for the same input", () => {
        const a = inferColumnTypes(buildParseResult(FIXTURES));
        const b = inferColumnTypes(buildParseResult(FIXTURES));
        expect(a).toEqual(b);
    });
});

describe("inferColumnTypes — privacy guard", () => {
    it("type does not include a `rows` field per item", () => {
        expectTypeOf<ColumnInference>().not.toMatchTypeOf<{ rows: unknown }>();
    });

    it("no field on any returned object holds an array longer than 5", () => {
        const result = inferColumnTypes(buildParseResult(FIXTURES));
        for (const inf of result) {
            for (const value of Object.values(inf)) {
                if (Array.isArray(value)) {
                    expect(value.length).toBeLessThanOrEqual(5);
                }
            }
        }
    });
});
