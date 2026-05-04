import { SignificanceBracket } from "./annotations/SignificanceBracket";
import type { ChartPreviewProps, StatAnnotation } from "./types";

type BoxPlotProps = ChartPreviewProps & {
    annotations?: readonly StatAnnotation[];
    strokeWeight?: number;
};

type BoxGroup = {
    x: number;
    q1: number;
    med: number;
    q3: number;
    lo: number;
    hi: number;
};

const GROUPS: readonly BoxGroup[] = [
    { x: 70, q1: 90, med: 70, q3: 50, lo: 110, hi: 35 },
    { x: 130, q1: 100, med: 80, q3: 60, lo: 120, hi: 45 },
    { x: 190, q1: 80, med: 60, q3: 40, lo: 100, hi: 25 },
    { x: 250, q1: 95, med: 75, q3: 55, lo: 115, hi: 40 },
];

const LABELS: readonly string[] = ["I", "II", "III", "IV"];

export const BoxPlot = ({
    w,
    h,
    responsive,
    annotations = [],
    strokeWeight = 0.9,
}: BoxPlotProps): JSX.Element => {
    const isResponsive = responsive ?? w === undefined;

    return (
        <svg
            viewBox="0 0 320 180"
            width={isResponsive ? "100%" : w}
            height={isResponsive ? undefined : h}
            preserveAspectRatio="xMidYMid meet"
            style={isResponsive ? { display: "block" } : undefined}
        >
            <line x1="30" y1="155" x2="290" y2="155" stroke="var(--ink)" strokeWidth="0.75" />
            <line x1="30" y1="20" x2="30" y2="155" stroke="var(--ink)" strokeWidth="0.75" />
            {GROUPS.map((g, i) => (
                <g key={i}>
                    <line x1={g.x} y1={g.lo} x2={g.x} y2={g.hi} stroke="var(--ink)" strokeWidth="0.75" />
                    <line x1={g.x - 6} y1={g.lo} x2={g.x + 6} y2={g.lo} stroke="var(--ink)" strokeWidth="0.75" />
                    <line x1={g.x - 6} y1={g.hi} x2={g.x + 6} y2={g.hi} stroke="var(--ink)" strokeWidth="0.75" />
                    <rect
                        x={g.x - 12}
                        y={g.q3}
                        width="24"
                        height={g.q1 - g.q3}
                        fill="none"
                        stroke="var(--ink)"
                        strokeWidth="0.9"
                    />
                    <line x1={g.x - 12} y1={g.med} x2={g.x + 12} y2={g.med} stroke="var(--ink)" strokeWidth="1.4" />
                    <text x={g.x} y="170" textAnchor="middle" fontSize="9" fontFamily="Inter" fill="var(--gray)">
                        {LABELS[i]}
                    </text>
                </g>
            ))}

            {annotations.map((a, idx) => {
                if (a.kind === "bracket") {
                    const from = GROUPS[a.from];
                    const to = GROUPS[a.to];
                    if (!from || !to) {
                        return null;
                    }

                    const minHi = Math.min(from.hi, to.hi);
                    const y = minHi - 6 - a.level * 14;

                    return (
                        <SignificanceBracket
                            key={`b${idx}`}
                            xFrom={from.x}
                            xTo={to.x}
                            y={y}
                            label={a.label}
                            pValue={a.pValue}
                            strokeWeight={strokeWeight}
                        />
                    );
                }

                const target = GROUPS[a.target];
                if (!target) {
                    return null;
                }

                return (
                    <text
                        key={`p${idx}`}
                        x={target.x}
                        y={target.hi - 6}
                        textAnchor="middle"
                        fontSize="9"
                        fontFamily="Inter"
                        fill="var(--gray)"
                    >
                        p = {a.pValue.toFixed(a.pValue < 0.001 ? 4 : 3)}
                    </text>
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
                TUMOR SIZE BY STAGE (mm)
            </text>
        </svg>
    );
};
