export type SampleColumnType = "id" | "categorical" | "numeric" | "tt-event";

export type SampleColumn = {
    name: string;
    type: SampleColumnType;
    samples: readonly string[];
    distinct?: number;
    range?: readonly [number, number];
    missing: number;
};

export const SAMPLE_COLUMNS: readonly SampleColumn[] = [
    {
        name: "patient_id",
        type: "id",
        samples: ["P-1042", "P-1043", "P-1044", "P-1045", "P-1046"],
        distinct: 2418,
        missing: 0,
    },
    {
        name: "treatment_arm",
        type: "categorical",
        samples: ["A", "B", "A", "A", "B"],
        distinct: 2,
        missing: 0,
    },
    {
        name: "age_at_baseline",
        type: "numeric",
        samples: ["64", "71", "58", "67", "73"],
        range: [29, 88],
        missing: 12,
    },
    {
        name: "stage",
        type: "categorical",
        samples: ["II", "III", "II", "IV", "III"],
        distinct: 4,
        missing: 7,
    },
    {
        name: "time_to_event_months",
        type: "numeric",
        samples: ["38.4", "12.1", "60.0", "27.6", "9.3"],
        range: [0.4, 60],
        missing: 0,
    },
    {
        name: "event_observed",
        type: "tt-event",
        samples: ["1", "1", "0", "1", "1"],
        distinct: 2,
        missing: 0,
    },
];

export const SAMPLE_FILE_NAME = "trial-cohort.csv";
export const SAMPLE_ROW_COUNT = 2418;
export const SAMPLE_FILE_SIZE = "184 KB";
