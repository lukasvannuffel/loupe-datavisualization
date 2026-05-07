import type { PrimaryType, SemanticTag } from "../inference.types";

export type Fixture = {
    readonly name: string;
    readonly values: readonly string[];
    readonly expected: {
        readonly primaryType: PrimaryType;
        readonly semanticTag?: SemanticTag;
    };
};

export const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const ISO_DATETIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/;

export const FIXTURES: readonly Fixture[] = [
    // numeric (≥5)
    {
        name: "weight_kg",
        values: ["72.4", "65.1", "80.0", "55.5", "92.3", "70.8", "85.7", "60.2", "78.9", "67.5"],
        expected: { primaryType: "numeric" },
    },
    {
        name: "height_cm",
        values: ["170.5", "180.2", "165.0", "175.5", "182.1", "168.4", "172.6", "190.5", "155.7", "163.2"],
        expected: { primaryType: "numeric" },
    },
    {
        name: "glucose_mmol",
        values: ["5.4", "6.1", "7.0", "5.8", "4.9", "6.5", "7.2", "5.1"],
        expected: { primaryType: "numeric" },
    },
    {
        name: "bmi",
        values: ["24.5", "27.2", "22.1", "30.5", "25.7", "29.3", "23.8", "26.4"],
        expected: { primaryType: "numeric" },
    },
    {
        name: "creatinine_mg",
        values: ["1.04", "1.22", "0.93", "1.15", "1.31", "0.88", "1.08", "1.27"],
        expected: { primaryType: "numeric" },
    },
    {
        name: "time_to_event_months",
        values: ["12.5", "8.3", "24.7", "6.2", "18.9", "30.1", "15.4", "9.7"],
        expected: { primaryType: "numeric", semanticTag: "time-to-event" },
    },
    {
        name: "survival_years",
        values: ["3.5", "5.2", "1.8", "4.0", "2.7", "6.1", "3.9", "2.4"],
        expected: { primaryType: "numeric", semanticTag: "time-to-event" },
    },

    // integer (≥5)
    {
        name: "age_years",
        values: ["35", "62", "47", "28", "55", "70", "41", "59", "33", "48"],
        expected: { primaryType: "integer" },
    },
    {
        name: "visit_count",
        values: ["3", "5", "1", "8", "2", "4", "6", "7"],
        expected: { primaryType: "integer" },
    },
    {
        name: "white_blood_cell_count",
        values: ["7000", "8500", "6200", "9100", "7800", "6900", "8200"],
        expected: { primaryType: "integer" },
    },
    {
        name: "platelets_thousand",
        values: ["250", "300", "180", "220", "320", "270", "190"],
        expected: { primaryType: "integer" },
    },
    {
        name: "num_lesions",
        values: ["0", "3", "1", "5", "2", "4", "0", "1", "2"],
        expected: { primaryType: "integer" },
    },
    {
        name: "t_event_days",
        values: ["120", "85", "365", "200", "450", "30", "150", "275"],
        expected: { primaryType: "integer", semanticTag: "time-to-event" },
    },
    {
        name: "months_to_recurrence",
        values: ["6", "12", "18", "24", "36", "9", "15"],
        expected: { primaryType: "integer", semanticTag: "time-to-event" },
    },
    // adversarial: looks year-like but no hyphens — must stay integer, NOT date
    {
        name: "report_year",
        values: ["2024", "2023", "2024", "2025", "2024", "2023", "2025"],
        expected: { primaryType: "integer" },
    },
    // adversarial: almost-binary — 0/1 with rare 2 → integer, not binary
    {
        name: "lesion_grade",
        values: ["0", "0", "1", "1", "0", "1", "2", "1", "0"],
        expected: { primaryType: "integer" },
    },

    // categorical (≥5)
    {
        name: "treatment_arm",
        values: ["control", "low_dose", "high_dose", "control", "low_dose", "high_dose", "control", "low_dose"],
        expected: { primaryType: "categorical" },
    },
    {
        name: "stage",
        values: ["I", "II", "III", "IV", "I", "II", "III", "IV", "I", "II"],
        expected: { primaryType: "categorical" },
    },
    {
        name: "ethnicity",
        values: [
            "white", "black", "asian", "hispanic", "other",
            "white", "black", "asian", "white", "black",
            "asian", "hispanic",
        ],
        expected: { primaryType: "categorical" },
    },
    {
        name: "region",
        values: ["north", "south", "east", "west", "north", "south", "east", "west", "north", "south"],
        expected: { primaryType: "categorical" },
    },
    {
        name: "blood_type",
        values: [
            "A+", "B+", "O+", "AB+", "A-", "B-", "O-", "AB-",
            "A+", "B+", "O+", "AB+", "A-", "B-", "O-", "AB-",
            "A+", "B+",
        ],
        expected: { primaryType: "categorical" },
    },
    {
        name: "center_code",
        values: ["BOS", "NYC", "LA", "BOS", "NYC", "LA", "BOS", "NYC"],
        expected: { primaryType: "categorical" },
    },
    // adversarial: date strings missing the 80% threshold → falls through to categorical
    {
        name: "messy_date_field",
        values: ["2024-01-15", "not-a-date", "2024-02-20", "invalid", "2024-03-10", "bad", "huh", "tomorrow"],
        expected: { primaryType: "categorical" },
    },

    // patient-id (≥3) — IDs always demote to categorical
    {
        name: "id",
        values: ["P001", "P002", "P003", "P004", "P005", "P006", "P007", "P008"],
        expected: { primaryType: "categorical", semanticTag: "patient-id" },
    },
    {
        name: "patient_id",
        values: ["1001", "1002", "1003", "1004", "1005", "1006", "1007"],
        expected: { primaryType: "categorical", semanticTag: "patient-id" },
    },
    {
        name: "subject_id",
        values: ["S-001", "S-002", "S-003", "S-004", "S-005", "S-006"],
        expected: { primaryType: "categorical", semanticTag: "patient-id" },
    },
    {
        name: "record_id",
        values: ["R001", "R002", "R003", "R004", "R005", "R006"],
        expected: { primaryType: "categorical", semanticTag: "patient-id" },
    },

    // binary (≥5)
    {
        name: "sex",
        values: ["M", "F", "F", "M", "M", "F", "F", "M"],
        expected: { primaryType: "binary" },
    },
    {
        name: "is_smoker",
        values: ["yes", "no", "yes", "yes", "no", "no", "yes"],
        expected: { primaryType: "binary" },
    },
    {
        name: "responder",
        values: ["true", "false", "true", "false", "true", "true"],
        expected: { primaryType: "binary" },
    },
    {
        name: "consent_signed",
        values: ["Y", "N", "Y", "Y", "N", "Y"],
        expected: { primaryType: "binary" },
    },
    // adversarial: 2 distinct values not in known patterns → still binary, but at 0.6
    {
        name: "fruit_type",
        values: ["apple", "pear", "apple", "pear", "apple", "pear"],
        expected: { primaryType: "binary" },
    },

    // event-status (≥3) — binary + event-name
    {
        name: "event_observed",
        values: ["1", "0", "1", "1", "0", "0", "1", "0"],
        expected: { primaryType: "binary", semanticTag: "event-status" },
    },
    {
        name: "death_status",
        values: ["1", "0", "0", "1", "0", "1"],
        expected: { primaryType: "binary", semanticTag: "event-status" },
    },
    {
        name: "relapse_event",
        values: ["yes", "no", "yes", "no", "yes", "no"],
        expected: { primaryType: "binary", semanticTag: "event-status" },
    },

    // date (≥5) — ISO 8601 only
    {
        name: "enrollment_date",
        values: ["2024-01-15", "2024-02-20", "2024-03-10", "2024-04-05", "2024-05-12", "2024-06-18"],
        expected: { primaryType: "date" },
    },
    {
        name: "date_of_birth",
        values: ["1980-06-15", "1965-03-22", "1990-11-30", "1972-08-14", "1985-12-01", "1978-04-20"],
        expected: { primaryType: "date" },
    },
    {
        name: "last_visit",
        values: ["2025-03-01", "2025-04-15", "2025-05-22", "2025-06-10", "2025-07-08"],
        expected: { primaryType: "date" },
    },
    {
        name: "diagnosis_date",
        values: ["2023-09-12", "2023-10-25", "2023-11-30", "2023-12-15", "2024-01-08"],
        expected: { primaryType: "date" },
    },
    {
        name: "treatment_start",
        values: ["2024-02-01", "2024-02-15", "2024-03-01", "2024-03-15", "2024-04-01"],
        expected: { primaryType: "date" },
    },

    // datetime (≥5)
    {
        name: "event_recorded_at",
        values: [
            "2024-01-15T14:30:00Z",
            "2024-02-20T09:15:00Z",
            "2024-03-10T16:45:00Z",
            "2024-04-05T11:00:00Z",
            "2024-05-12T13:20:00Z",
        ],
        expected: { primaryType: "datetime" },
    },
    {
        name: "sample_collected_at",
        values: [
            "2024-01-15T14:30:45",
            "2024-02-20T09:15:30",
            "2024-03-10T16:45:12",
            "2024-04-05T11:00:00",
            "2024-05-12T13:20:55",
        ],
        expected: { primaryType: "datetime" },
    },
    {
        name: "assay_run_at",
        values: [
            "2024-06-01T08:00:00.000Z",
            "2024-06-02T08:00:00.000Z",
            "2024-06-03T08:00:00.000Z",
            "2024-06-04T08:00:00.000Z",
            "2024-06-05T08:00:00.000Z",
        ],
        expected: { primaryType: "datetime" },
    },
    {
        name: "visit_at",
        values: [
            "2024-07-01T10:30:00+02:00",
            "2024-07-02T11:45:00+02:00",
            "2024-07-03T09:15:00+02:00",
            "2024-07-04T14:00:00+02:00",
            "2024-07-05T16:20:00+02:00",
        ],
        expected: { primaryType: "datetime" },
    },
    {
        name: "uploaded_at",
        values: [
            "2025-01-01T00:00:00Z",
            "2025-01-02T00:00:00Z",
            "2025-01-03T00:00:00Z",
            "2025-01-04T00:00:00Z",
            "2025-01-05T00:00:00Z",
        ],
        expected: { primaryType: "datetime" },
    },
];
