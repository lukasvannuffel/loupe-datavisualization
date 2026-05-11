import type { DetectorResult, PrimaryType } from "../inference.types";

const NUMERIC_THRESHOLD = 0.8;
const INTEGER_THRESHOLD = 0.95;
const DATE_THRESHOLD = 0.8;
const DATETIME_THRESHOLD = 0.8;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/;

const KNOWN_BINARY_PATTERNS: readonly ReadonlySet<string>[] = [
    new Set(["0", "1"]),
    new Set(["true", "false"]),
    new Set(["yes", "no"]),
    new Set(["y", "n"]),
    new Set(["m", "f"]),
];

const empty: DetectorResult = { matches: false, confidence: 0, reasons: [] };

const isFiniteNumeric = (v: string): boolean => {
    const n = Number(v);

    return Number.isFinite(n);
};

export const detectNumeric = (values: readonly string[]): DetectorResult => {
    if (values.length === 0) {
        return empty;
    }
    let parsed = 0;
    for (const v of values) {
        if (isFiniteNumeric(v)) {
            parsed++;
        }
    }
    const confidence = parsed / values.length;

    return {
        matches: confidence >= NUMERIC_THRESHOLD,
        confidence,
        reasons: [`numeric: ${parsed}/${values.length} parsed`],
    };
};

export const detectInteger = (values: readonly string[]): DetectorResult => {
    if (values.length === 0) {
        return empty;
    }
    let parsed = 0;
    let integer = 0;
    for (const v of values) {
        const n = Number(v);
        if (Number.isFinite(n)) {
            parsed++;
            if (Number.isInteger(n)) {
                integer++;
            }
        }
    }
    const parsedRatio = parsed / values.length;
    const integerRatio = parsed === 0 ? 0 : integer / parsed;
    const matches = parsedRatio >= NUMERIC_THRESHOLD && integerRatio >= INTEGER_THRESHOLD;

    return {
        matches,
        confidence: integerRatio * parsedRatio,
        reasons: [`integer: ${integer}/${parsed} integer of ${values.length}`],
    };
};

export const detectBinary = (values: readonly string[]): DetectorResult => {
    if (values.length === 0) {
        return empty;
    }
    const distinct = new Set(values.map((v) => v.toLowerCase()));
    if (distinct.size !== 2) {
        return empty;
    }
    const known = KNOWN_BINARY_PATTERNS.some((pattern) => {
        if (pattern.size !== distinct.size) {
            return false;
        }
        for (const x of distinct) {
            if (!pattern.has(x)) {
                return false;
            }
        }

        return true;
    });

    return {
        matches: true,
        confidence: known ? 0.95 : 0.6,
        reasons: [known ? "binary: known pattern" : "binary: 2 distinct values"],
    };
};

export const detectCategorical = (values: readonly string[]): DetectorResult => {
    if (values.length === 0) {
        return empty;
    }
    const distinct = new Set(values).size;
    const ratio = distinct / values.length;
    const numericMatches = detectNumeric(values).matches;
    const matches = distinct <= 20 && ratio <= 0.5 && !numericMatches;

    return {
        matches,
        // Clamped to [0.55, 0.95] so a matching categorical never sits exactly on the UI's < 0.5 threshold.
        confidence: matches ? Math.max(0.55, Math.min(0.95, 1 - ratio)) : 0,
        reasons: [`categorical: ${distinct} distinct, ratio ${ratio.toFixed(2)}`],
    };
};

const isValidIsoDate = (v: string): boolean => {
    if (!ISO_DATE.test(v)) {
        return false;
    }
    const parts = v.split("-").map(Number);
    const [y, m, day] = [parts[0], parts[1], parts[2]];
    const d = new Date(Date.UTC(y, m - 1, day));

    return (
        !Number.isNaN(d.getTime()) &&
        d.getUTCFullYear() === y &&
        d.getUTCMonth() + 1 === m &&
        d.getUTCDate() === day
    );
};

export const detectDate = (values: readonly string[]): DetectorResult => {
    if (values.length === 0) {
        return empty;
    }
    let matched = 0;
    for (const v of values) {
        if (isValidIsoDate(v)) {
            matched++;
        }
    }
    const confidence = matched / values.length;

    return {
        matches: confidence >= DATE_THRESHOLD,
        confidence,
        reasons: [`date: ${matched}/${values.length} ISO 8601 dates`],
    };
};

export const detectDatetime = (values: readonly string[]): DetectorResult => {
    if (values.length === 0) {
        return empty;
    }
    let matched = 0;
    for (const v of values) {
        if (ISO_DATETIME.test(v) && !Number.isNaN(new Date(v).getTime())) {
            matched++;
        }
    }
    const confidence = matched / values.length;

    return {
        matches: confidence >= DATETIME_THRESHOLD,
        confidence,
        reasons: [`datetime: ${matched}/${values.length} ISO 8601 datetimes`],
    };
};

export type PrimaryDecision = {
    readonly primaryType: PrimaryType;
    readonly confidence: number;
    readonly reasons: readonly string[];
};

const decide = (primaryType: PrimaryType, result: DetectorResult): PrimaryDecision => {
    return {
        primaryType,
        confidence: result.confidence,
        reasons: result.reasons,
    };
};

const FALLBACK_CONFIDENCE = 0.4;

export const resolvePrimary = (values: readonly string[]): PrimaryDecision => {
    if (values.length === 0) {
        return {
            primaryType: "categorical",
            confidence: FALLBACK_CONFIDENCE,
            reasons: ["column has no values"],
        };
    }
    const datetime = detectDatetime(values);
    if (datetime.matches) {
        return decide("datetime", datetime);
    }
    const date = detectDate(values);
    if (date.matches) {
        return decide("date", date);
    }
    const binary = detectBinary(values);
    if (binary.matches && binary.confidence >= 0.95) {
        return decide("binary", binary);
    }
    const integer = detectInteger(values);
    if (integer.matches) {
        return decide("integer", integer);
    }
    const numeric = detectNumeric(values);
    if (numeric.matches) {
        return decide("numeric", numeric);
    }
    if (binary.matches) {
        return decide("binary", binary);
    }
    const categorical = detectCategorical(values);
    if (categorical.matches) {
        return decide("categorical", categorical);
    }

    return {
        primaryType: "categorical",
        confidence: FALLBACK_CONFIDENCE,
        reasons: ["no detector reached 0.5 confidence"],
    };
};
