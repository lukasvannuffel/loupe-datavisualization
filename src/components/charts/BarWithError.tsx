import { SignificanceBracket } from "./annotations/SignificanceBracket";
import type { StatAnnotation } from "./types";

type BarWithErrorProps = {
    animated?: boolean;
    colorA?: string;
    xLabel?: string;
    yLabel?: string;
    showGrid?: boolean;
    errorBarType?: "sd" | "sem" | "ci95";
    annotations?: readonly StatAnnotation[];
    strokeWeight?: number;
};

const GROUP_LABELS: readonly string[] = ["Stage I", "Stage II", "Stage III", "Stage IV"];
const GROUP_VALUES: readonly number[] = [0.86, 0.71, 0.54, 0.32];

const ERROR_MAGNITUDE: Record<NonNullable<BarWithErrorProps["errorBarType"]>, readonly number[]> = {
    sd: [0.07, 0.09, 0.11, 0.10],
    sem: [0.025, 0.032, 0.038, 0.034],
    ci95: [0.05, 0.063, 0.075, 0.067],
};

const VIEW_W = 620;
const VIEW_H = 360;
const PLOT_LEFT = 50;
const PLOT_RIGHT = 600;
const PLOT_TOP = 60;
const PLOT_BOTTOM = 280;
const PLOT_W = PLOT_RIGHT - PLOT_LEFT;
const PLOT_H = PLOT_BOTTOM - PLOT_TOP;
const BAND_COUNT = GROUP_LABELS.length;
const BAND_W = PLOT_W / BAND_COUNT;
const BAR_W = BAND_W * 0.5;

const Y_TICKS: readonly number[] = [0, 0.25, 0.5, 0.75, 1];

export const BarWithError = ({
    animated = true,
    colorA = "var(--ink)",
    xLabel = "DISEASE STAGE",
    yLabel = "5-YEAR SURVIVAL PROBABILITY",
    showGrid = false,
    errorBarType = "ci95",
    annotations = [],
    strokeWeight = 1,
}: BarWithErrorProps): JSX.Element => {
    const errors = ERROR_MAGNITUDE[errorBarType];
    const valueToY = (v: number): number => PLOT_BOTTOM - v * PLOT_H;
    const groupCenterX = (i: number): number => PLOT_LEFT + BAND_W * (i + 0.5);

    return (
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="rec-chart-svg">
            {showGrid &&
                Y_TICKS.slice(1).map((v, i) => {
                    const y = valueToY(v);

                    return (
                        <line
                            key={`g${i}`}
                            x1={PLOT_LEFT}
                            x2={PLOT_RIGHT}
                            y1={y}
                            y2={y}
                            stroke="var(--hairline)"
                            strokeWidth="0.6"
                        />
                    );
                })}

            <line
                x1={PLOT_LEFT}
                y1={PLOT_BOTTOM}
                x2={PLOT_RIGHT}
                y2={PLOT_BOTTOM}
                stroke="var(--ink)"
                strokeWidth="0.8"
            />
            <line
                x1={PLOT_LEFT}
                y1={PLOT_TOP}
                x2={PLOT_LEFT}
                y2={PLOT_BOTTOM}
                stroke="var(--ink)"
                strokeWidth="0.8"
            />

            {Y_TICKS.map((v, i) => {
                const y = valueToY(v);

                return (
                    <g key={i}>
                        <line
                            x1={PLOT_LEFT - 4}
                            x2={PLOT_LEFT}
                            y1={y}
                            y2={y}
                            stroke="var(--ink)"
                            strokeWidth="0.6"
                        />
                        <text
                            x={PLOT_LEFT - 8}
                            y={y + 3}
                            textAnchor="end"
                            fontSize="10"
                            fontFamily="Inter"
                            fill="var(--gray)"
                        >
                            {v.toFixed(2)}
                        </text>
                    </g>
                );
            })}

            {GROUP_VALUES.map((value, i) => {
                const cx = groupCenterX(i);
                const top = valueToY(value);
                const errorTop = valueToY(value + errors[i]);
                const errorBot = valueToY(Math.max(0, value - errors[i]));
                const x = cx - BAR_W / 2;

                return (
                    <g key={i}>
                        <rect
                            x={x}
                            y={top}
                            width={BAR_W}
                            height={PLOT_BOTTOM - top}
                            fill={colorA}
                            opacity={0.92}
                            style={
                                animated
                                    ? {
                                          transformOrigin: `${cx}px ${PLOT_BOTTOM}px`,
                                          animation: `barRise 700ms cubic-bezier(0.22,0.61,0.36,1) ${
                                              80 + i * 90
                                          }ms both`,
                                      }
                                    : undefined
                            }
                        />
                        <line
                            x1={cx}
                            x2={cx}
                            y1={errorBot}
                            y2={errorTop}
                            stroke="var(--ink)"
                            strokeWidth={strokeWeight}
                        />
                        <line
                            x1={cx - 6}
                            x2={cx + 6}
                            y1={errorTop}
                            y2={errorTop}
                            stroke="var(--ink)"
                            strokeWidth={strokeWeight}
                        />
                        <line
                            x1={cx - 6}
                            x2={cx + 6}
                            y1={errorBot}
                            y2={errorBot}
                            stroke="var(--ink)"
                            strokeWidth={strokeWeight}
                        />
                        <text
                            x={cx}
                            y={PLOT_BOTTOM + 16}
                            textAnchor="middle"
                            fontSize="10.5"
                            fontFamily="Inter"
                            fill="var(--ink)"
                        >
                            {GROUP_LABELS[i]}
                        </text>
                    </g>
                );
            })}

            {annotations.map((a, idx) => {
                if (a.kind === "bracket") {
                    const xFrom = groupCenterX(a.from);
                    const xTo = groupCenterX(a.to);
                    const baseY = Math.min(
                        valueToY(GROUP_VALUES[a.from] + errors[a.from]),
                        valueToY(GROUP_VALUES[a.to] + errors[a.to]),
                    );
                    const y = baseY - 18 - a.level * 22;

                    return (
                        <SignificanceBracket
                            key={`b${idx}`}
                            xFrom={xFrom}
                            xTo={xTo}
                            y={y}
                            label={a.label}
                            pValue={a.pValue}
                            strokeWeight={strokeWeight}
                        />
                    );
                }

                const cx = groupCenterX(a.target);
                const baseY = valueToY(GROUP_VALUES[a.target] + errors[a.target]) - 8;

                return (
                    <text
                        key={`p${idx}`}
                        x={cx}
                        y={baseY}
                        textAnchor="middle"
                        fontSize="10.5"
                        fontFamily="Inter"
                        fill="var(--gray)"
                    >
                        p = {a.pValue.toFixed(a.pValue < 0.001 ? 4 : 3)}
                    </text>
                );
            })}

            <text
                x={(PLOT_LEFT + PLOT_RIGHT) / 2}
                y="320"
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

            <text
                x={PLOT_RIGHT}
                y={PLOT_TOP - 10}
                textAnchor="end"
                fontSize="10"
                fontFamily="Inter"
                fill="var(--gray)"
                letterSpacing="0.08em"
            >
                ERRORS · {errorBarType.toUpperCase()}
            </text>
        </svg>
    );
};
