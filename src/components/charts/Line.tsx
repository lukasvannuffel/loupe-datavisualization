import type { ChartPreviewProps } from "./types";

type LinePoint = {
    x: number;
    y: number;
};

const POINTS_A: readonly LinePoint[] = [
    { x: 50, y: 130 },
    { x: 100, y: 110 },
    { x: 150, y: 92 },
    { x: 200, y: 72 },
    { x: 250, y: 58 },
    { x: 290, y: 46 },
];

const POINTS_B: readonly LinePoint[] = [
    { x: 50, y: 122 },
    { x: 100, y: 124 },
    { x: 150, y: 102 },
    { x: 200, y: 96 },
    { x: 250, y: 82 },
    { x: 290, y: 78 },
];

const buildPath = (points: readonly LinePoint[]): string =>
    points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

const PATH_A = buildPath(POINTS_A);
const PATH_B = buildPath(POINTS_B);

export const Line = ({ w, h, responsive }: ChartPreviewProps): JSX.Element => {
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
            <path d={PATH_B} fill="none" stroke="var(--ink)" strokeWidth="1" strokeDasharray="4 3" opacity="0.7" />
            <path d={PATH_A} fill="none" stroke="var(--ink)" strokeWidth="1.4" />
            {POINTS_A.map((p, i) => (
                <circle key={`a${i}`} cx={p.x} cy={p.y} r="2" fill="var(--ink)" />
            ))}
            {POINTS_B.map((p, i) => (
                <circle key={`b${i}`} cx={p.x} cy={p.y} r="1.6" fill="none" stroke="var(--ink)" strokeWidth="0.8" />
            ))}
            <text
                x="160"
                y="172"
                textAnchor="middle"
                fontSize="9"
                fontFamily="Inter"
                fill="var(--gray)"
                letterSpacing="0.04em"
            >
                MONTH
            </text>
        </svg>
    );
};
