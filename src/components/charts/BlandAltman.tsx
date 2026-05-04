import type { ChartPreviewProps } from "./types";

type BlandPoint = {
    x: number;
    y: number;
};

const buildPoints = (): readonly BlandPoint[] => {
    const pts: BlandPoint[] = [];
    let s = 11;

    for (let i = 0; i < 50; i++) {
        s = (s * 9301 + 49297) % 233280;
        const x = 50 + (s / 233280) * 230;
        s = (s * 9301 + 49297) % 233280;
        const y = 60 + (s / 233280) * 70;
        pts.push({ x, y });
    }

    return pts;
};

const POINTS = buildPoints();

export const BlandAltman = ({ w, h, responsive }: ChartPreviewProps): JSX.Element => {
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
            <line x1="40" y1="95" x2="290" y2="95" stroke="var(--ink)" strokeWidth="0.75" />
            <line x1="40" y1="50" x2="290" y2="50" stroke="var(--gray-2)" strokeWidth="0.5" strokeDasharray="3 3" />
            <line x1="40" y1="140" x2="290" y2="140" stroke="var(--gray-2)" strokeWidth="0.5" strokeDasharray="3 3" />
            {POINTS.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="1.6" fill="none" stroke="var(--ink)" strokeWidth="0.7" />
            ))}
            <text x="288" y="46" textAnchor="end" fontSize="8" fontFamily="Inter" fill="var(--gray)">
                +1.96 SD
            </text>
            <text x="288" y="136" textAnchor="end" fontSize="8" fontFamily="Inter" fill="var(--gray)">
                −1.96 SD
            </text>
            <text
                x="160"
                y="172"
                textAnchor="middle"
                fontSize="9"
                fontFamily="Inter"
                fill="var(--gray)"
                letterSpacing="0.04em"
            >
                MEAN OF METHODS
            </text>
        </svg>
    );
};
