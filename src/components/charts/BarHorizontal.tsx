import type { ChartPreviewProps } from "./types";

type HBar = {
    y: number;
    width: number;
    label: string;
};

const X_AXIS_START = 90;
const Y_AXIS_BOTTOM = 155;
const BAR_HEIGHT = 16;

const BARS: readonly HBar[] = [
    { y: 32, width: 195, label: "Headache" },
    { y: 56, width: 165, label: "Nausea" },
    { y: 80, width: 140, label: "Fatigue" },
    { y: 104, width: 110, label: "Rash" },
    { y: 128, width: 80, label: "Diarrhea" },
];

export const BarHorizontal = ({ w, h, responsive }: ChartPreviewProps): JSX.Element => {
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
                x1={X_AXIS_START}
                y1={Y_AXIS_BOTTOM}
                x2="290"
                y2={Y_AXIS_BOTTOM}
                stroke="var(--ink)"
                strokeWidth="0.75"
            />
            <line
                x1={X_AXIS_START}
                y1="20"
                x2={X_AXIS_START}
                y2={Y_AXIS_BOTTOM}
                stroke="var(--ink)"
                strokeWidth="0.75"
            />
            {BARS.map((b) => (
                <g key={b.label}>
                    <rect
                        x={X_AXIS_START}
                        y={b.y - BAR_HEIGHT / 2}
                        width={b.width}
                        height={BAR_HEIGHT}
                        fill="var(--ink)"
                    />
                    <text
                        x={X_AXIS_START - 6}
                        y={b.y + 3}
                        textAnchor="end"
                        fontSize="9"
                        fontFamily="Inter"
                        fill="var(--gray)"
                    >
                        {b.label}
                    </text>
                </g>
            ))}
            <text
                x="190"
                y="172"
                textAnchor="middle"
                fontSize="9"
                fontFamily="Inter"
                fill="var(--gray)"
                letterSpacing="0.04em"
            >
                FREQUENCY
            </text>
        </svg>
    );
};
