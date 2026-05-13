export type PhiMatch = { readonly column: string; readonly reason: string };

/**
 * PHI-like column headers: prefer missing borderline PHI over false positives on benign clinical names.
 * Trade-off documented per LOUPE-06 review: `treatment_name` stays clear of `\bname\b` (underscore glues "name");
 * some compound headers may be missed — acceptable vs blocking routine covariates.
 */
const PHI_PATTERNS: ReadonlyArray<{ regex: RegExp; reason: string }> = [
    {
        regex: /\b(first\s*[-_]?\s*name|last\s*[-_]?\s*name|full\s*[-_]?\s*name|surname)\b/i,
        reason: "personal name",
    },
    { regex: /\bpatient[_]?first[_]?name\b/i, reason: "personal name" },
    { regex: /\bsubject[_]?full[_]?name\b/i, reason: "personal name" },
    { regex: /\bname\b/i, reason: "personal name" },
    { regex: /\binitials?\b/i, reason: "personal initials" },
    { regex: /\b(dob|date.?of.?birth|birth.?date)\b/i, reason: "date of birth" },
    { regex: /\b(mrn|medical.?record.?number)\b/i, reason: "medical record number" },
    { regex: /\b(ssn|social.?security)\b/i, reason: "social security number" },
    { regex: /\b(insurance|policy.?number)\b/i, reason: "insurance identifier" },
    { regex: /\b(address|street|postal.?code|zip)\b/i, reason: "address" },
    { regex: /\b(phone|telephone|mobile)\b/i, reason: "phone number" },
    { regex: /\b(email)\b/i, reason: "email address" },
];

export const detectPhiColumns = (headers: ReadonlyArray<string>): ReadonlyArray<PhiMatch> => {
    const out: PhiMatch[] = [];

    for (const h of headers) {
        const match = PHI_PATTERNS.find((p) => p.regex.test(h));

        if (match) {
            out.push({ column: h, reason: match.reason });
        }
    }

    return out;
};
