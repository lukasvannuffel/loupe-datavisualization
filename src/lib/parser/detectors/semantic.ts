import type { PrimaryType, SemanticTag } from "../inference.types";

const TIME_NAME = /^(time|months?|days?|weeks?|years?|t[._-]?event|survival|follow.?up|fu)/i;
const TIME_BODY = /(_to_event|time_to_)/i;
// EVENT_NAME is intentionally unanchored — clinical CSV headers commonly suffix event indicators
// (progression_event, recurrence_status). ID_NAME below is anchored because its prefixes are themselves
// complete column names; matching them as substrings would over-fire.
const EVENT_NAME = /(event|status|death|censor|outcome|relapse)/i;
const ID_NAME = /^(id|subject|(patient|record)[._-]?id|patientid|recordid)$/i;
const TIME_TO_EVENT_PARSED_RATIO = 0.9;

/** time-to-event: numeric/integer + name like time/months/survival, parsedRatio ≥ 0.9, all parsed values ≥ 0. */
export const detectTimeToEvent = (
    name: string,
    primary: PrimaryType,
    values: readonly string[],
): boolean => {
    if (primary !== "numeric" && primary !== "integer") {
        return false;
    }
    if (!(TIME_NAME.test(name) || TIME_BODY.test(name))) {
        return false;
    }
    if (values.length === 0) {
        return false;
    }
    let parsed = 0;
    for (const v of values) {
        const n = Number(v);
        if (Number.isFinite(n)) {
            parsed++;
            if (n < 0) {
                return false;
            }
        }
    }

    return parsed / values.length >= TIME_TO_EVENT_PARSED_RATIO;
};

/** event-status: binary + name like event/status/death/censor/outcome/relapse. */
export const detectEventStatus = (name: string, primary: PrimaryType): boolean => {
    return primary === "binary" && EVENT_NAME.test(name);
};

/** patient-id: name like id/subject/patient/record + ≥95% unique. IDs are labels, not magnitudes — averaging them is meaningless. */
export const detectPatientId = (
    name: string,
    uniqueCount: number,
    sampleSize: number,
): boolean => {
    if (sampleSize === 0) {
        return false;
    }

    return ID_NAME.test(name) && uniqueCount / sampleSize >= 0.95;
};

export const detectSemantic = (
    name: string,
    primary: PrimaryType,
    values: readonly string[],
    uniqueCount: number,
): SemanticTag | undefined => {
    if (detectPatientId(name, uniqueCount, values.length)) {
        return "patient-id";
    }
    if (detectTimeToEvent(name, primary, values)) {
        return "time-to-event";
    }
    if (detectEventStatus(name, primary)) {
        return "event-status";
    }

    return undefined;
};
