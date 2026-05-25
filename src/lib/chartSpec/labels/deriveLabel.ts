const MEDICAL_ABBREVIATIONS = new Map<string, string>([
    ["bp", "BP"],
    ["ldl", "LDL"],
    ["hdl", "HDL"],
    ["hba1c", "HbA1c"],
    ["cimt", "CIMT"],
    ["sbp", "SBP"],
    ["dbp", "DBP"],
    ["bmi", "BMI"],
    ["gfr", "GFR"],
    ["egfr", "eGFR"],
    ["wbc", "WBC"],
    ["rbc", "RBC"],
    ["rct", "RCT"],
    ["os", "OS"],
    ["pfs", "PFS"],
    ["mmse", "MMSE"],
]);

const KNOWN_UNITS = new Set([
    "mmhg",
    "mmol",
    "mg",
    "kg",
    "g",
    "l",
    "ml",
    "cm",
    "mm",
    "m",
    "s",
    "min",
    "hr",
    "hours",
    "days",
    "months",
    "years",
    "pct",
    "percent",
    "n",
    "count",
    "score",
]);

const UNIT_DISPLAY = new Map<string, string>([
    ["mmhg", "mmHg"],
    ["mmol", "mmol"],
    ["mg", "mg"],
    ["kg", "kg"],
    ["g", "g"],
    ["l", "L"],
    ["ml", "mL"],
    ["cm", "cm"],
    ["mm", "mm"],
    ["m", "m"],
    ["s", "s"],
    ["min", "min"],
    ["hr", "hr"],
    ["hours", "hours"],
    ["days", "days"],
    ["months", "months"],
    ["years", "years"],
    ["pct", "%"],
    ["percent", "%"],
    ["n", "n"],
    ["count", "count"],
    ["score", "score"],
]);

const formatToken = (token: string, index: number): string => {
    const lower = token.toLowerCase();
    if (MEDICAL_ABBREVIATIONS.has(lower)) {
        return MEDICAL_ABBREVIATIONS.get(lower)!;
    }

    if (index === 0) {
        return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
    }

    return token.toLowerCase();
};

/** Column header → human-readable axis/category label (LOUPE-15a). */
export const deriveLabel = (columnName: string): string => {
    if (columnName.trim().length === 0) {
        return "";
    }

    const tokens = columnName
        .replace(/([a-z])([A-Z])/g, "$1_$2")
        .split("_")
        .filter((token) => token.length > 0);

    let unit: string | null = null;
    if (tokens.length >= 2) {
        const last = tokens[tokens.length - 1]!.toLowerCase();
        const lastTwo = `${tokens[tokens.length - 2]!.toLowerCase()}${last}`;
        if (KNOWN_UNITS.has(lastTwo)) {
            unit = UNIT_DISPLAY.get(lastTwo) ?? lastTwo;
            tokens.pop();
            tokens.pop();
        }
        else if (KNOWN_UNITS.has(last)) {
            unit = UNIT_DISPLAY.get(last) ?? last;
            tokens.pop();
        }
    }

    if (tokens.length === 0) {
        return unit ? `(${unit})` : "";
    }

    const base = tokens.map((token, index) => formatToken(token, index)).join(" ");

    return unit ? `${base} (${unit})` : base;
};
