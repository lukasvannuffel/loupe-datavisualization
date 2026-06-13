import type { ChartSpec, PaletteId, PlotData } from "@/lib/chartSpec/types";
import type { Mapping } from "@/lib/roles/types";

import packageJson from "../../../package.json";
import type { ComputationSummary } from "./composeReceipt";
import { hashSpecAndComputations } from "./hashSpec";
import { methodString } from "./methodStrings";
import { summarizeComputations } from "./summarizeComputations";
import { receiptSchema, type Receipt } from "./schemas";
import { sampleString } from "./sampleStrings";

const LOUPE_VERSION = packageJson.version;

export type BuildReceiptInput = {
    readonly aiRationale: string;
    readonly chartSpec: ChartSpec;
    readonly columnMapping: Mapping;
    readonly generatedAt?: string;
    readonly nRowsInput: number;
    readonly palette: PaletteId;
    readonly plotData: PlotData;
    readonly computations?: ComputationSummary;
};

const csvColumnsFromMapping = (mapping: Mapping): readonly string[] =>
    [...new Set(Object.values(mapping).filter((value): value is string => typeof value === "string"))].sort();

export const buildReceipt = async (input: BuildReceiptInput): Promise<Receipt> => {
    const computations =
        input.computations ??
        summarizeComputations(
            input.chartSpec,
            input.plotData,
            input.columnMapping,
            input.generatedAt ?? new Date().toISOString(),
        );
    const generatedAt = input.generatedAt ?? computations.computedAt;

    const receipt: Receipt = {
        ai_rationale: input.aiRationale,
        config_hash: await hashSpecAndComputations(input.chartSpec, computations),
        csv_columns: csvColumnsFromMapping(input.columnMapping),
        generated_at: generatedAt,
        method: methodString(input.chartSpec.kind),
        n_rows_input: input.nRowsInput,
        palette: input.palette,
        sample: sampleString(input.chartSpec, input.plotData),
        software: `Loupe v${LOUPE_VERSION} · client-side`,
    };

    return receiptSchema.parse(receipt);
};
