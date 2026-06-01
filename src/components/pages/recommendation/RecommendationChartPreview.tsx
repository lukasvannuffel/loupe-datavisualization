import type { LoupeDataset } from "@/app/providers";
import { SpecChartPanel } from "@/components/charts/SpecChartPanel";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { RingLoader } from "@/components/primitives/RingLoader";
import type { BarErrorAggregation } from "@/lib/chartSpec/aggregators/barError.types";
import type { ChartSpec, Receipt } from "@/lib/chartSpec/types";
import type { Mapping } from "@/lib/roles/types";

import { formatOverrideHistory } from "../formatOverrideHistory";
import { RecommendationBarErrorChart } from "./RecommendationBarErrorChart";
import { RecommendationMappingAlert } from "./RecommendationMappingAlert";
import type { BarErrorMappingResult } from "./barErrorMapping";

type RecommendationChartPreviewProps = {
    readonly barErrorAggregation: BarErrorAggregation | undefined;
    readonly barErrorMapResult: BarErrorMappingResult;
    readonly barErrorMapping: Mapping;
    readonly canCustomize: boolean;
    readonly chartKind: ChartSpec["kind"];
    readonly dataset: LoupeDataset;
    readonly isDisplayOverridden: boolean;
    readonly liveSpec: ChartSpec;
    readonly mapping: Mapping;
    readonly phase: number;
    readonly receipt: Receipt;
    readonly title: string;
};

export const RecommendationChartPreview = ({
    barErrorAggregation,
    barErrorMapResult,
    barErrorMapping,
    canCustomize,
    chartKind,
    dataset,
    isDisplayOverridden,
    liveSpec,
    mapping,
    phase,
    receipt,
    title,
}: RecommendationChartPreviewProps): JSX.Element => (
    <div className="rec-chart">
        <div className="rec-chart-head">
            <div>
                <Eyebrow>Recommended figure</Eyebrow>
                <h3 className="rec-chart-title" contentEditable suppressContentEditableWarning>
                    {title}
                </h3>
            </div>
            <span className="muted mono rec-chart-tag">FIG · DRAFT</span>
        </div>
        <div className="rec-chart-frame">
            {phase >= 2 && !canCustomize ? <RecommendationMappingAlert /> : null}
            {isDisplayOverridden ? (
                <span
                    role="status"
                    className="rec-override-badge mono muted"
                    title={formatOverrideHistory(receipt.overrides)}
                    aria-label={`Chart overridden. ${formatOverrideHistory(receipt.overrides)}`}
                >
                    Overridden by you
                </span>
            ) : null}
            {phase >= 2 ? (
                <div className="rec-chart-reveal">
                    {chartKind === "barError" &&
                    liveSpec.kind === "barError" &&
                    barErrorAggregation ? (
                        <RecommendationBarErrorChart
                            barErrorAggregation={barErrorAggregation}
                            barErrorMapResult={barErrorMapResult}
                            barErrorMapping={barErrorMapping}
                            chartKind={chartKind}
                            dataset={dataset}
                            liveSpec={liveSpec}
                            mapping={mapping}
                        />
                    ) : (
                        <SpecChartPanel
                            chartKind={chartKind}
                            dataset={dataset}
                            mapping={mapping}
                            spec={liveSpec}
                        />
                    )}
                    <p className="rec-chart-hint muted small">
                        Tune colors and labels on the export step.
                    </p>
                </div>
            ) : (
                <div className="rec-chart-frame-loading">
                    <RingLoader />
                </div>
            )}
        </div>
    </div>
);
