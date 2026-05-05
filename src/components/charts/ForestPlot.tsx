import type { ChartPreviewProps } from "./types";

type ForestRow = {
    y: number;
    est: number;
    lo: number;
    hi: number;
    lab: string;
};

const ROWS: readonly ForestRow[] = [
    { y: 35, est: 180, lo: 150, hi: 210, lab: "Overall" },
    { y: 60, est: 210, lo: 175, hi: 245, lab: "Age <65" },
    { y: 85, est: 165, lo: 130, hi: 200, lab: "Age ≥65" },
    { y: 110, est: 195, lo: 162, hi: 230, lab: "Female" },
    { y: 135, est: 175, lo: 145, hi: 220, lab: "Male" },
];

export const ForestPlot = ({ w, h, responsive }: ChartPreviewProps): JSX.Element => {
    const isResponsive = responsive ?? w === undefined;

    return (
        <svg
            viewBox="0 0 320 180"
            width={isResponsive ? "100%" : w}
            height={isResponsive ? undefined : h}
            preserveAspectRatio="xMidYMid meet"
            style={isResponsive ? { display: "block" } : undefined}
        >
            <line x1="180" y1="20" x2="180" y2="155" stroke="var(--gray-2)" strokeWidth="0.5" strokeDasharray="2 2" />
            <line x1="80" y1="155" x2="280" y2="155" stroke="var(--ink)" strokeWidth="0.75" />
            {ROWS.map((r, i) => (
                <g key={i}>
                    <text
                        x="74"
                        y={r.y + 3}
                        textAnchor="end"
                        fontSize="9"
                        fontFamily="Inter"
                        fill="var(--ink)"
                    >
                        {r.lab}
                    </text>
                    <line x1={r.lo} y1={r.y} x2={r.hi} y2={r.y} stroke="var(--ink)" strokeWidth="0.9" />
                    <line x1={r.lo} y1={r.y - 3} x2={r.lo} y2={r.y + 3} stroke="var(--ink)" strokeWidth="0.9" />
                    <line x1={r.hi} y1={r.y - 3} x2={r.hi} y2={r.y + 3} stroke="var(--ink)" strokeWidth="0.9" />
                    <rect x={r.est - 3} y={r.y - 3} width="6" height="6" fill="var(--ink)" />
                </g>
            ))}
            <text
                x="180"
                y="172"
                textAnchor="middle"
                fontSize="9"
                fontFamily="Inter"
                fill="var(--gray)"
                letterSpacing="0.04em"
            >
                HAZARD RATIO (95% CI)
            </text>
        </svg>
    );
};
