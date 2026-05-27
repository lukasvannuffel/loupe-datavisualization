import type { ChartSpec, PaletteName, PlotData } from "@/lib/chartSpec/types";
import type { Mapping } from "@/lib/roles/types";

import packageJson from "../../../package.json";
import { computeConfigHash } from "./configHash";
import { methodString } from "./methodStrings";
import { receiptSchema, type Receipt } from "./schemas";
import { sampleString } from "./sampleStrings";

const LOUPE_VERSION = packageJson.version;

export type BuildReceiptInput = {
    readonly aiRationale: string;
    readonly chartSpec: ChartSpec;
    readonly columnMapping: Mapping;
    readonly generatedAt?: string;
    readonly nRowsInput: number;
    readonly palette: PaletteName;
    readonly plotData: PlotData;
};

const csvColumnsFromMapping = (mapping: Mapping): readonly string[] =>
    [...new Set(Object.values(mapping).filter((value): value is string => typeof value === "string"))].sort();

export const buildReceipt = async (input: BuildReceiptInput): Promise<Receipt> => {
    const receipt: Receipt = {
        ai_rationale: input.aiRationale,
        config_hash: await computeConfigHash(input.chartSpec),
        csv_columns: csvColumnsFromMapping(input.columnMapping),
        generated_at: input.generatedAt ?? new Date().toISOString(),
        method: methodString(input.chartSpec.kind),
        n_rows_input: input.nRowsInput,
        palette: input.palette,
        sample: sampleString(input.chartSpec, input.plotData),
        software: `Loupe v${LOUPE_VERSION} · client-side`,
    };

    return receiptSchema.parse(receipt);
};
