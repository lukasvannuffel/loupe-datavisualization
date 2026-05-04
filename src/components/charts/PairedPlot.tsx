import type { ChartPreviewProps } from "./types";

type PairedSubject = {
    yPre: number;
    yPost: number;
};

const X_PRE = 110;
const X_POST = 210;
const BASELINE_Y = 155;

const SUBJECTS: readonly PairedSubject[] = [
    { yPre: 120, yPost: 70 },
    { yPre: 105, yPost: 62 },
    { yPre: 130, yPost: 90 },
    { yPre: 95, yPost: 55 },
    { yPre: 138, yPost: 96 },
    { yPre: 112, yPost: 78 },
    { yPre: 125, yPost: 102 },
    { yPre: 100, yPost: 65 },
    { yPre: 118, yPost: 80 },
];

export const PairedPlot = ({ w, h, responsive }: ChartPreviewProps): JSX.Element => {
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
            <line x1={X_PRE} y1="20" x2={X_PRE} y2={BASELINE_Y} stroke="var(--gray-2)" strokeWidth="0.5" strokeDasharray="2 2" />
            <line x1={X_POST} y1="20" x2={X_POST} y2={BASELINE_Y} stroke="var(--gray-2)" strokeWidth="0.5" strokeDasharray="2 2" />
            {SUBJECTS.map((s, i) => (
                <g key={i}>
                    <line
                        x1={X_PRE}
                        y1={s.yPre}
                        x2={X_POST}
                        y2={s.yPost}
                        stroke="var(--ink)"
                        strokeWidth="0.7"
                        opacity="0.55"
                    />
                    <circle cx={X_PRE} cy={s.yPre} r="2.4" fill="none" stroke="var(--ink)" strokeWidth="0.8" />
                    <circle cx={X_POST} cy={s.yPost} r="2.4" fill="var(--ink)" />
                </g>
            ))}
            <text x={X_PRE} y="172" textAnchor="middle" fontSize="9" fontFamily="Inter" fill="var(--gray)">
                Pre
            </text>
            <text x={X_POST} y="172" textAnchor="middle" fontSize="9" fontFamily="Inter" fill="var(--gray)">
                Post
            </text>
        </svg>
    );
};
