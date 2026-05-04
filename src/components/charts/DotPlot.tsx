type DotPlotProps = {
    animated?: boolean;
    colorA?: string;
    xLabel?: string;
    yLabel?: string;
    showGrid?: boolean;
    strokeWeight?: number;
    pointSize?: number;
};

const ROW_LABELS: readonly string[] = [
    "Pembrolizumab",
    "Nivolumab",
    "Atezolizumab",
    "Durvalumab",
    "Ipilimumab",
    "Cemiplimab",
    "Tislelizumab",
    "Camrelizumab",
];

const ROW_VALUES: readonly number[] = [0.71, 0.66, 0.58, 0.55, 0.41, 0.49, 0.45, 0.39];

const VIEW_W = 620;
const VIEW_H = 360;
const PLOT_LEFT = 180;
const PLOT_RIGHT = 600;
const PLOT_TOP = 50;
const PLOT_BOTTOM = 300;
const PLOT_W = PLOT_RIGHT - PLOT_LEFT;
const ROW_COUNT = ROW_LABELS.length;
const ROW_GAP = (PLOT_BOTTOM - PLOT_TOP) / (ROW_COUNT - 1);

const X_TICKS: readonly number[] = [0, 0.25, 0.5, 0.75, 1];

export const DotPlot = ({
    animated = true,
    colorA = "var(--ink)",
    xLabel = "OBJECTIVE RESPONSE RATE",
    yLabel = "AGENT",
    showGrid = true,
    strokeWeight = 1,
    pointSize = 4,
}: DotPlotProps): JSX.Element => {
    const valueToX = (v: number): number => PLOT_LEFT + v * PLOT_W;
    const rowY = (i: number): number => PLOT_TOP + i * ROW_GAP;

    return (
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="rec-chart-svg">
            {showGrid &&
                X_TICKS.slice(1).map((v, i) => {
                    const x = valueToX(v);

                    return (
                        <line
                            key={`g${i}`}
                            x1={x}
                            x2={x}
                            y1={PLOT_TOP - 10}
                            y2={PLOT_BOTTOM + 10}
                            stroke="var(--hairline)"
                            strokeWidth="0.6"
                        />
                    );
                })}

            <line
                x1={PLOT_LEFT}
                y1={PLOT_BOTTOM + 10}
                x2={PLOT_RIGHT}
                y2={PLOT_BOTTOM + 10}
                stroke="var(--ink)"
                strokeWidth="0.8"
            />

            {X_TICKS.map((v, i) => {
                const x = valueToX(v);

                return (
                    <g key={i}>
                        <line
                            x1={x}
                            x2={x}
                            y1={PLOT_BOTTOM + 10}
                            y2={PLOT_BOTTOM + 14}
                            stroke="var(--ink)"
                            strokeWidth="0.6"
                        />
                        <text
                            x={x}
                            y={PLOT_BOTTOM + 26}
                            textAnchor="middle"
                            fontSize="10"
                            fontFamily="Inter"
                            fill="var(--gray)"
                        >
                            {v.toFixed(2)}
                        </text>
                    </g>
                );
            })}

            {ROW_LABELS.map((label, i) => {
                const y = rowY(i);
                const cx = valueToX(ROW_VALUES[i]);

                return (
                    <g key={i}>
                        <line
                            x1={PLOT_LEFT}
                            x2={cx}
                            y1={y}
                            y2={y}
                            stroke="var(--hairline)"
                            strokeWidth={strokeWeight}
                            strokeDasharray="2 3"
                        />
                        <text
                            x={PLOT_LEFT - 12}
                            y={y + 4}
                            textAnchor="end"
                            fontSize="11"
                            fontFamily="Inter"
                            fill="var(--ink)"
                        >
                            {label}
                        </text>
                        <circle
                            cx={cx}
                            cy={y}
                            r={pointSize}
                            fill={colorA}
                            style={
                                animated
                                    ? {
                                          transformOrigin: `${cx}px ${y}px`,
                                          animation: `dotPop 520ms cubic-bezier(0.22,0.61,0.36,1) ${
                                              80 + i * 60
                                          }ms both`,
                                      }
                                    : undefined
                            }
                        />
                    </g>
                );
            })}

            <text
                x={(PLOT_LEFT + PLOT_RIGHT) / 2}
                y="334"
                textAnchor="middle"
                fontSize="11"
                fontFamily="Inter"
                fill="var(--ink)"
                letterSpacing="0.06em"
            >
                {xLabel}
            </text>
            <text
                x="14"
                y={(PLOT_TOP + PLOT_BOTTOM) / 2}
                textAnchor="middle"
                fontSize="11"
                fontFamily="Inter"
                fill="var(--ink)"
                letterSpacing="0.06em"
                transform={`rotate(-90 14 ${(PLOT_TOP + PLOT_BOTTOM) / 2})`}
            >
                {yLabel}
            </text>
        </svg>
    );
};
