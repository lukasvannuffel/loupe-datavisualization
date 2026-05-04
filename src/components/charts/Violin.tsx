import { SignificanceBracket } from "./annotations/SignificanceBracket";
import type { ChartPreviewProps, StatAnnotation } from "./types";

type ViolinProps = ChartPreviewProps & {
    annotations?: readonly StatAnnotation[];
    strokeWeight?: number;
};

const WIDTHS: readonly number[] = [4, 9, 14, 18, 16, 12, 10, 8, 6, 4];
const LABELS: readonly string[] = ["A", "B", "C"];
const CENTERS: readonly number[] = [100, 170, 240];

const violinPath = (cx: number): string => {
    let up = `M ${cx} 30 `;
    let down = "";

    WIDTHS.forEach((wd, i) => {
        const y = 30 + i * 12;
        up += `Q ${cx + wd + 1} ${y - 6} ${cx + wd} ${y} `;
        down = `Q ${cx - wd - 1} ${y - 6} ${cx - wd} ${y} ` + down;
    });

    return up + `L ${cx} 150 ` + down + " Z";
};

export const Violin = ({
    w,
    h,
    responsive,
    annotations = [],
    strokeWeight = 0.9,
}: ViolinProps): JSX.Element => {
    const isResponsive = responsive ?? w === undefined;

    return (
        <svg
            viewBox="0 0 320 180"
            width={isResponsive ? "100%" : w}
            height={isResponsive ? undefined : h}
            preserveAspectRatio="xMidYMid meet"
            style={isResponsive ? { display: "block" } : undefined}
        >
            <line x1="40" y1="155" x2="290" y2="155" stroke="var(--ink)" strokeWidth="0.75" />
            <line x1="40" y1="20" x2="40" y2="155" stroke="var(--ink)" strokeWidth="0.75" />
            {CENTERS.map((cx, i) => (
                <g key={i}>
                    <path d={violinPath(cx)} fill="var(--paper-2)" stroke="var(--ink)" strokeWidth="0.8" />
                    <line x1={cx - 3} y1="80" x2={cx + 3} y2="80" stroke="var(--ink)" strokeWidth="1.2" />
                    <text x={cx} y="170" textAnchor="middle" fontSize="9" fontFamily="Inter" fill="var(--gray)">
                        {LABELS[i]}
                    </text>
                </g>
            ))}

            {annotations.map((a, idx) => {
                if (a.kind === "bracket") {
                    const xFrom = CENTERS[a.from];
                    const xTo = CENTERS[a.to];
                    if (xFrom === undefined || xTo === undefined) {
                        return null;
                    }

                    const y = 24 - a.level * 12;

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

                const cx = CENTERS[a.target];
                if (cx === undefined) {
                    return null;
                }

                return (
                    <text
                        key={`p${idx}`}
                        x={cx}
                        y="24"
                        textAnchor="middle"
                        fontSize="9"
                        fontFamily="Inter"
                        fill="var(--gray)"
                    >
                        p = {a.pValue.toFixed(a.pValue < 0.001 ? 4 : 3)}
                    </text>
                );
            })}
        </svg>
    );
};
