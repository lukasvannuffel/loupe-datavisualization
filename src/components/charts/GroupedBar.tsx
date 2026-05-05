import { SignificanceBracket } from "./annotations/SignificanceBracket";
import type { StatAnnotation } from "./types";

type GroupedBarProps = {
    animated?: boolean;
    colorA?: string;
    colorB?: string;
    dashB?: boolean;
    xLabel?: string;
    yLabel?: string;
    legendA?: string;
    legendB?: string;
    showLegend?: boolean;
    showGrid?: boolean;
    errorBarType?: "sd" | "sem" | "ci95";
    annotations?: readonly StatAnnotation[];
    strokeWeight?: number;
};

const GROUP_LABELS: readonly string[] = ["Baseline", "3 mo", "6 mo", "12 mo"];
const VALUES_A: readonly number[] = [0.42, 0.58, 0.71, 0.74];
const VALUES_B: readonly number[] = [0.40, 0.49, 0.55, 0.51];

const ERROR_MAGNITUDE: Record<NonNullable<GroupedBarProps["errorBarType"]>, readonly number[]> = {
    sd: [0.05, 0.07, 0.08, 0.07],
    sem: [0.018, 0.026, 0.029, 0.024],
    ci95: [0.036, 0.052, 0.058, 0.048],
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
const BAR_W = BAND_W * 0.34;
const BAR_GAP = 2;

const Y_TICKS: readonly number[] = [0, 0.25, 0.5, 0.75, 1];

export const GroupedBar = ({
    animated = true,
    colorA = "var(--ink)",
    colorB = "var(--gray)",
    dashB = false,
    xLabel = "TIME POINT",
    yLabel = "RESPONSE RATE",
    legendA = "Treatment A",
    legendB = "Treatment B",
    showLegend = true,
    showGrid = false,
    errorBarType = "sem",
    annotations = [],
    strokeWeight = 1,
}: GroupedBarProps): JSX.Element => {
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

            {GROUP_LABELS.map((label, i) => {
                const cx = groupCenterX(i);
                const xA = cx - BAR_W - BAR_GAP / 2;
                const xB = cx + BAR_GAP / 2;
                const valA = VALUES_A[i];
                const valB = VALUES_B[i];
                const topA = valueToY(valA);
                const topB = valueToY(valB);
                const errA = errors[i];
                const errB = errors[i] * 0.9;

                return (
                    <g key={i}>
                        <rect
                            x={xA}
                            y={topA}
                            width={BAR_W}
                            height={PLOT_BOTTOM - topA}
                            fill={colorA}
                            opacity={0.92}
                            style={
                                animated
                                    ? {
                                          animation: `barRise 700ms cubic-bezier(0.22,0.61,0.36,1) ${
                                              80 + i * 80
                                          }ms both`,
                                          transformOrigin: `${xA + BAR_W / 2}px ${PLOT_BOTTOM}px`,
                                      }
                                    : undefined
                            }
                        />
                        <rect
                            x={xB}
                            y={topB}
                            width={BAR_W}
                            height={PLOT_BOTTOM - topB}
                            fill={colorB}
                            opacity={0.92}
                            style={
                                dashB
                                    ? {
                                          fill: `url(#diag-${i})`,
                                      }
                                    : animated
                                        ? {
                                              animation: `barRise 700ms cubic-bezier(0.22,0.61,0.36,1) ${
                                                  140 + i * 80
                                              }ms both`,
                                              transformOrigin: `${xB + BAR_W / 2}px ${PLOT_BOTTOM}px`,
                                          }
                                        : undefined
                            }
                        />

                        {dashB && (
                            <pattern
                                id={`diag-${i}`}
                                patternUnits="userSpaceOnUse"
                                width="6"
                                height="6"
                                patternTransform="rotate(45)"
                            >
                                <rect width="3" height="6" fill={colorB} />
                            </pattern>
                        )}

                        <line
                            x1={xA + BAR_W / 2}
                            x2={xA + BAR_W / 2}
                            y1={valueToY(Math.max(0, valA - errA))}
                            y2={valueToY(valA + errA)}
                            stroke="var(--ink)"
                            strokeWidth={strokeWeight}
                        />
                        <line
                            x1={xA + BAR_W / 2 - 5}
                            x2={xA + BAR_W / 2 + 5}
                            y1={valueToY(valA + errA)}
                            y2={valueToY(valA + errA)}
                            stroke="var(--ink)"
                            strokeWidth={strokeWeight}
                        />
                        <line
                            x1={xB + BAR_W / 2}
                            x2={xB + BAR_W / 2}
                            y1={valueToY(Math.max(0, valB - errB))}
                            y2={valueToY(valB + errB)}
                            stroke="var(--ink)"
                            strokeWidth={strokeWeight}
                        />
                        <line
                            x1={xB + BAR_W / 2 - 5}
                            x2={xB + BAR_W / 2 + 5}
                            y1={valueToY(valB + errB)}
                            y2={valueToY(valB + errB)}
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
                            {label}
                        </text>
                    </g>
                );
            })}

            {annotations.map((a, idx) => {
                if (a.kind === "bracket") {
                    const xFrom = groupCenterX(a.from);
                    const xTo = groupCenterX(a.to);
                    const baseValue = Math.max(
                        VALUES_A[a.from] + errors[a.from],
                        VALUES_A[a.to] + errors[a.to],
                        VALUES_B[a.from] + errors[a.from],
                        VALUES_B[a.to] + errors[a.to],
                    );
                    const y = valueToY(baseValue) - 18 - a.level * 22;

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
                const baseValue = Math.max(
                    VALUES_A[a.target] + errors[a.target],
                    VALUES_B[a.target] + errors[a.target],
                );
                const baseY = valueToY(baseValue) - 8;

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

            {showLegend && (
                <g>
                    <rect x="430" y="56" width="14" height="10" fill={colorA} />
                    <text x="450" y="65" fontSize="11" fontFamily="Inter" fill="var(--ink)">
                        {legendA}
                    </text>
                    <rect
                        x="430"
                        y="76"
                        width="14"
                        height="10"
                        fill={dashB ? "url(#diag-legend)" : colorB}
                    />
                    {dashB && (
                        <pattern
                            id="diag-legend"
                            patternUnits="userSpaceOnUse"
                            width="6"
                            height="6"
                            patternTransform="rotate(45)"
                        >
                            <rect width="3" height="6" fill={colorB} />
                        </pattern>
                    )}
                    <text x="450" y="85" fontSize="11" fontFamily="Inter" fill="var(--ink)">
                        {legendB}
                    </text>
                </g>
            )}

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
        </svg>
    );
};
