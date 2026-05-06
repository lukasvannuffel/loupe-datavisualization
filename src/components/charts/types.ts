import type { StatAnnotation } from "@/lib/chartSpec/types";

export type { StatAnnotation };

export type ChartPreviewProps = {
    w?: number;
    h?: number;
    responsive?: boolean;
};

export type KaplanMeierProps = ChartPreviewProps & {
    animated?: boolean;
    accent?: boolean;
};

export type PublicationChartProps = {
    animated?: boolean;
    colorA?: string;
    colorB?: string;
    dashB?: boolean;
    xLabel?: string;
    yLabel?: string;
    legendA?: string;
    legendB?: string;
    showLegend?: boolean;
    showAtRisk?: boolean;
    showStats?: boolean;
    showGrid?: boolean;
    strokeWeight?: number;
    errorBarType?: "sd" | "sem" | "ci95";
    annotations?: readonly StatAnnotation[];
    pointSize?: number;
};
