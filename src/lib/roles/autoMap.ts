import type { ColumnInference } from "@/lib/parser/inference.types";
import type { ColumnRole } from "@/app/providers";
import type { Mapping } from "@/app/providers";

const ID_NAME = /^(id|subject|(patient|record)[._-]?id|patientid|recordid)$/i;
const GROUP_NAME = /(arm|group|cohort|treatment|condition)/i;

/**
 * Strict-signals-only auto-mapping: use semantic tags and high-confidence name patterns.
 * No type-based fallback — a generic numeric column never auto-fills `outcome`/`time`.
 * First match wins per role; later matches are ignored so we don't overwrite a stronger signal.
 */
export const autoMapColumns = (inferences: readonly ColumnInference[]): Mapping => {
    const mapping: Mapping = {};
    const claim = (role: ColumnRole, column: string): void => {
        if (mapping[role] === undefined) {
            mapping[role] = column;
        }
    };

    for (const col of inferences) {
        if (col.semanticTag === "time-to-event") {
            claim("time", col.name);
            continue;
        }
        if (col.semanticTag === "event-status") {
            claim("event", col.name);
            continue;
        }
        if (col.semanticTag === "patient-id" || ID_NAME.test(col.name)) {
            claim("id", col.name);
            continue;
        }
        if (
            (col.primaryType === "categorical" || col.primaryType === "binary") &&
            GROUP_NAME.test(col.name)
        ) {
            claim("group", col.name);
        }
    }

    return mapping;
};
