import type { ChartSpec, Receipt } from "@/lib/chartSpec/types";
import type { PrimaryType, SemanticTag } from "@/lib/parser/inference.types";
import type { ColumnRole } from "@/lib/roles/types";

export type AiColumn = {
    readonly name: string;
    readonly primaryType: PrimaryType;
    readonly semanticTag?: SemanticTag;
    readonly nullCount: number;
    readonly uniqueCount: number;
};

export type RecommendPayload = {
    readonly columns: ReadonlyArray<AiColumn>;
    readonly mapping: Partial<Record<ColumnRole, string>>;
    readonly intent: string;
};

export type RecommendInput = RecommendPayload;

export type RecommendResult =
    | {
          readonly ok: true;
          readonly receipt: Receipt;
          readonly chartType: ChartSpec["kind"];
          readonly costEstimateEur: number;
      }
    | {
          readonly ok: false;
          readonly code:
              | "MISSING_ENV"
              | "UPSTREAM_FAILURE"
              | "TIMEOUT"
              | "VALIDATION_FAILED"
              | "PRIVACY_VIOLATION";
          readonly message: string;
      };
