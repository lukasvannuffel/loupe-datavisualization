import type { ChartPreviewProps } from "./types";

type LollipopRow = {
    y: number;
    value: number;
    label: string;
};

const X_START = 100;
const Y_AXIS_BOTTOM = 155;

const ROWS: readonly LollipopRow[] = [
    { y: 28, value: 252, label: "Pembrolizumab" },
    { y: 50, value: 218, label: "Nivolumab" },
    { y: 72, value: 188, label: "Atezolizumab" },
    { y: 94, value: 162, label: "Avelumab" },
    { y: 116, value: 132, label: "Durvalumab" },
    { y: 138, value: 96, label: "Cemiplimab" },
];

export const Lollipop = ({ w, h, responsive }: ChartPreviewProps): JSX.Element => {
    const isResponsive = responsive ?? w === undefined;

    return (
        <svg
            viewBox="0 0 320 180"
            width={isResponsive ? "100%" : w}
            height={isResponsive ? undefined : h}
            preserveAspectRatio="xMidYMid meet"
            style={isResponsive ? { display: "block" } : undefined}
        >
            <line
                x1={X_START}
                y1={Y_AXIS_BOTTOM}
                x2="290"
                y2={Y_AXIS_BOTTOM}
                stroke="var(--ink)"
                strokeWidth="0.75"
            />
            <line
                x1={X_START}
                y1="20"
                x2={X_START}
                y2={Y_AXIS_BOTTOM}
                stroke="var(--ink)"
                strokeWidth="0.75"
            />
            {ROWS.map((r) => (
                <g key={r.label}>
                    <line
                        x1={X_START}
                        y1={r.y}
                        x2={X_START + r.value * 0.7}
                        y2={r.y}
                        stroke="var(--gray)"
                        strokeWidth="0.9"
                    />
                    <circle cx={X_START + r.value * 0.7} cy={r.y} r="3.4" fill="var(--ink)" />
                    <text
                        x={X_START - 6}
                        y={r.y + 3}
                        textAnchor="end"
                        fontSize="9"
                        fontFamily="Inter"
                        fill="var(--gray)"
                    >
                        {r.label}
                    </text>
                </g>
            ))}
        </svg>
    );
};
