// Empty headers are renamed to `column_N` (1-indexed, matches user mental model).
// Duplicate headers loop the suffix counter until unused, so a source that
// already contains `a_1` cannot collide with a generated `a_1` from a duplicate `a`.
export const dedupeHeaders = (raw: readonly string[]): string[] => {
    const used = new Set<string>();
    const out: string[] = [];

    raw.forEach((name, index) => {
        const base = name === "" ? `column_${index + 1}` : name;
        if (!used.has(base)) {
            used.add(base);
            out.push(base);

            return;
        }

        let n = 1;
        let candidate = `${base}_${n}`;
        while (used.has(candidate)) {
            n += 1;
            candidate = `${base}_${n}`;
        }
        used.add(candidate);
        out.push(candidate);
    });

    return out;
};
