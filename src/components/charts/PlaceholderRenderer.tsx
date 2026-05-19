import { CHART_PREVIEWS } from "@/components/charts/chartPreviews";
import type { ChartSpec } from "@/lib/chartSpec/types";

const KIND_LABELS: Record<ChartSpec["kind"], string> = {
    barError: "Bar with error bars",
    box: "Box plot",
    km: "Kaplan–Meier",
    xy: "XY plot",
};

type PlaceholderRendererProps = {
    readonly kind: ChartSpec["kind"];
};

export const PlaceholderRenderer = ({ kind }: PlaceholderRendererProps): JSX.Element => {
    const Preview = CHART_PREVIEWS[kind];
    const label = KIND_LABELS[kind];

    return (
        <div className="rec-chart-placeholder">
            <Preview h={200} w={320} />
            <p className="rec-chart-placeholder-caption muted mono">
                {label} renderer coming soon, your override is recorded.
            </p>
        </div>
    );
};
