export { ROLE_TYPE_COMPATIBILITY, ROLE_REQUIREMENTS_BY_INTENT } from "./requirements";
export type { ChartIntent } from "./requirements";
export { ROLE_LABELS, ASSIGNABLE_ROLES } from "./describe";
export { autoMapColumns } from "./autoMap";
export {
    validateMapping,
    roleForColumn,
    countAssigned,
    type ValidationResult,
    type ValidationStatus,
} from "./validate";
export {
    getCompatibility,
    SPEC_KIND_TO_INTENT,
    type ChartCompatibility,
} from "./compatibility";
