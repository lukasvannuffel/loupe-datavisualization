import type { ChartPreviewProps } from "./types";

const BIN_WIDTH = 24;
const X_START = 32;
const BASELINE_Y = 155;

const BIN_HEIGHTS: readonly number[] = [10, 26, 48, 78, 108, 112, 92, 62, 36, 18];

export const Histogram = ({ w, h, responsive }: ChartPreviewProps): JSX.Element => {
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
            {BIN_HEIGHTS.map((height, i) => {
                const x = X_START + i * BIN_WIDTH;
                const y = BASELINE_Y - height;

                return (
                    <rect
                        key={i}
                        x={x}
                        y={y}
                        width={BIN_WIDTH}
                        height={height}
                        fill="var(--ink)"
                        stroke="var(--paper)"
                        strokeWidth="0.5"
                    />
                );
            })}
            <text
                x="160"
                y="172"
                textAnchor="middle"
                fontSize="9"
                fontFamily="Inter"
                fill="var(--gray)"
                letterSpacing="0.04em"
            >
                AGE AT DIAGNOSIS
            </text>
        </svg>
    );
};
