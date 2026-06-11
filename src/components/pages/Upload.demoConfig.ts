import type { Mapping } from "@/app/providers";

export type DemoConfig = {
    readonly id: string;
    readonly label: string;
    readonly file: string;
    readonly intent: string;
    readonly mapping: Mapping;
};

export const DEMO_CONFIGS: readonly DemoConfig[] = [
    {
        id: "km",
        label: "Demo 1",
        file: "nsclc_adjuvant_trial.csv",
        intent:
            "I want to compare overall survival between the chemotherapy arm and the observation arm over the 5-year follow-up period. Some patients were still alive at the data cutoff and didn't reach the endpoint.",
        mapping: {
            time: "os_months",
            event: "os_event",
            group: "arm",
        },
    },
    {
        id: "bar",
        label: "Demo 2",
        file: "copd_fev1_gold_stages.csv",
        intent:
            "I want to report mean FEV1 % predicted for each GOLD severity stage with 95% confidence intervals, for the methods section of a respiratory journal submission.",
        mapping: {
            group: "gold_stage",
            outcome: "fev1_pct_predicted",
        },
    },
    {
        id: "box",
        label: "Demo 3",
        file: "dili_alt_oncology_trial.csv",
        intent:
            "I want to visualise the distribution of peak ALT values across the four hepatotoxicity grades and show where the extreme values sit. The data is skewed and I don't want to just show means.",
        mapping: {
            group: "dili_grade",
            outcome: "alt_peak_u_l",
        },
    },
    {
        id: "xy",
        label: "Demo 4",
        file: "ovarian_cancer_ca125_residual.csv",
        intent:
            "I need to show whether pre-operative CA-125 level predicts residual tumour burden after cytoreductive surgery, and whether that relationship differs between stage III and stage IV disease.",
        mapping: {
            x: "ca125_preop_u_ml",
            y: "residual_tumour_mm",
            group: "figo_stage",
        },
    },
];
