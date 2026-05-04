import type { ChartPreviewProps } from "./types";

type BarValue = {
    x: number;
    top: number;
    label: string;
};

const BAR_WIDTH = 28;
const BASELINE_Y = 155;

const BARS: readonly BarValue[] = [
    { x: 56, top: 70, label: "I" },
    { x: 102, top: 95, label: "II" },
    { x: 148, top: 50, label: "III" },
    { x: 194, top: 110, label: "IV" },
    { x: 240, top: 80, label: "V" },
];

export const Bar = ({ w, h, responsive }: ChartPreviewProps): JSX.Element => {
    const isResponsive = responsive ?? w === undefined;

    return (
        <svg
            viewBox="0 0 320 180"
            width={isResponsive ? "100%" : w}
            height={isResponsive ? undefined : h}
            preserveAspectRatio="xMidYMid meet"
            style={isResponsive ? { display: "block" } : undefined}
        >
            <line x1="30" y1={BASELINE_Y} x2="290" y2={BASELINE_Y} stroke="var(--ink)" strokeWidth="0.75" />
            <line x1="30" y1="20" x2="30" y2={BASELINE_Y} stroke="var(--ink)" strokeWidth="0.75" />
            {BARS.map((b) => (
                <g key={b.label}>
                    <rect
                        x={b.x}
                        y={b.top}
                        width={BAR_WIDTH}
                        height={BASELINE_Y - b.top}
                        fill="var(--ink)"
                    />
                    <text
                        x={b.x + BAR_WIDTH / 2}
                        y="170"
                        textAnchor="middle"
                        fontSize="9"
                        fontFamily="Inter"
                        fill="var(--gray)"
                    >
                        {b.label}
                    </text>
                </g>
            ))}
            <text
                x="160"
                y="14"
                textAnchor="middle"
                fontSize="9"
                fontFamily="Inter"
                fill="var(--gray)"
                letterSpacing="0.04em"
            >
                PATIENTS PER STAGE
            </text>
        </svg>
    );
};
