import type { ChartPreviewProps } from "./types";

type StackedBarValue = {
    x: number;
    label: string;
    seg1: number;
    seg2: number;
    seg3: number;
};

const BAR_WIDTH = 36;
const BASELINE_Y = 155;

const BARS: readonly StackedBarValue[] = [
    { x: 58, label: "I", seg1: 28, seg2: 32, seg3: 18 },
    { x: 122, label: "II", seg1: 42, seg2: 48, seg3: 22 },
    { x: 186, label: "III", seg1: 22, seg2: 30, seg3: 14 },
    { x: 250, label: "IV", seg1: 48, seg2: 38, seg3: 28 },
];

export const StackedBar = ({ w, h, responsive }: ChartPreviewProps): JSX.Element => {
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
            {BARS.map((b) => {
                const seg1Y = BASELINE_Y - b.seg1;
                const seg2Y = seg1Y - b.seg2;
                const seg3Y = seg2Y - b.seg3;

                return (
                    <g key={b.label}>
                        <rect x={b.x} y={seg1Y} width={BAR_WIDTH} height={b.seg1} fill="var(--ink)" />
                        <rect x={b.x} y={seg2Y} width={BAR_WIDTH} height={b.seg2} fill="var(--gray)" />
                        <rect x={b.x} y={seg3Y} width={BAR_WIDTH} height={b.seg3} fill="var(--gray-2)" />
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
                );
            })}
            <text
                x="160"
                y="14"
                textAnchor="middle"
                fontSize="9"
                fontFamily="Inter"
                fill="var(--gray)"
                letterSpacing="0.04em"
            >
                ADVERSE EVENTS BY ARM
            </text>
        </svg>
    );
};
