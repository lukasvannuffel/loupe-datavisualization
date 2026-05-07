import type { PrimaryType, SemanticTag } from "../inference.types";

const TIME_NAME = /^(time|months?|days?|weeks?|years?|t[._-]?event|survival|follow.?up|fu)/i;
const TIME_BODY = /(_to_event|time_to_)/i;
const EVENT_NAME = /(event|status|death|censor|outcome|relapse)/i;
const ID_NAME = /^(id|subject|patient|record)([._-]?id)?$/i;

/** time-to-event: numeric/integer + name like time/months/survival, all values ≥ 0. */
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
    for (const v of values) {
        const n = Number(v);
        if (Number.isFinite(n) && n < 0) {
            return false;
        }
    }

    return true;
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
