import type { ChartPreviewProps } from "./types";

type StackedBar100Value = {
    x: number;
    label: string;
    p1: number;
    p2: number;
    p3: number;
};

const BAR_WIDTH = 36;
const TOP_Y = 30;
const BASELINE_Y = 155;
const TOTAL_HEIGHT = BASELINE_Y - TOP_Y;

const BARS: readonly StackedBar100Value[] = [
    { x: 58, label: "I", p1: 0.28, p2: 0.45, p3: 0.27 },
    { x: 122, label: "II", p1: 0.42, p2: 0.36, p3: 0.22 },
    { x: 186, label: "III", p1: 0.22, p2: 0.5, p3: 0.28 },
    { x: 250, label: "IV", p1: 0.48, p2: 0.32, p3: 0.2 },
];

export const StackedBar100 = ({ w, h, responsive }: ChartPreviewProps): JSX.Element => {
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
            <line x1="30" y1={TOP_Y} x2="30" y2={BASELINE_Y} stroke="var(--ink)" strokeWidth="0.75" />
            {BARS.map((b) => {
                const seg1H = b.p1 * TOTAL_HEIGHT;
                const seg2H = b.p2 * TOTAL_HEIGHT;
                const seg3H = b.p3 * TOTAL_HEIGHT;
                const seg1Y = BASELINE_Y - seg1H;
                const seg2Y = seg1Y - seg2H;
                const seg3Y = seg2Y - seg3H;

                return (
                    <g key={b.label}>
                        <rect x={b.x} y={seg1Y} width={BAR_WIDTH} height={seg1H} fill="var(--ink)" />
                        <rect x={b.x} y={seg2Y} width={BAR_WIDTH} height={seg2H} fill="var(--gray)" />
                        <rect x={b.x} y={seg3Y} width={BAR_WIDTH} height={seg3H} fill="var(--gray-2)" />
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
                x="22"
                y={TOP_Y + 3}
                textAnchor="end"
                fontSize="8"
                fontFamily="Inter"
                fill="var(--gray)"
            >
                100%
            </text>
            <text x="22" y={BASELINE_Y + 3} textAnchor="end" fontSize="8" fontFamily="Inter" fill="var(--gray)">
                0%
            </text>
        </svg>
    );
};
