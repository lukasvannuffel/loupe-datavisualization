import type { ColumnRole } from "@/lib/roles/types";

/** Human-facing label per role. Used in the role-select dropdown and the validation strip. */
export const ROLE_LABELS: Readonly<Record<ColumnRole, string>> = {
    ignore: "— Ignore —",
    id: "Identifier",
    time: "Time variable",
    event: "Event indicator",
    group: "Group / arm",
    outcome: "Outcome",
    predictor: "Predictor",
    x: "X axis",
    y: "Y axis",
};

/** All assignable roles (ignore is the absence of an assignment, kept separate for select-option ordering). */
export const ASSIGNABLE_ROLES: readonly ColumnRole[] = [
    "id",
    "time",
    "event",
    "group",
    "outcome",
    "predictor",
    "x",
    "y",
];
