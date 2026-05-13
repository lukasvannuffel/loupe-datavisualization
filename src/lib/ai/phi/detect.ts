export type PhiMatch = { readonly column: string; readonly reason: string };

const PHI_PATTERNS: ReadonlyArray<{ regex: RegExp; reason: string }> = [
    { regex: /^(first.?name|last.?name|full.?name|surname)$/i, reason: "personal name" },
    { regex: /^name$/i, reason: "personal name" },
    { regex: /^initials?$/i, reason: "personal initials" },
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
