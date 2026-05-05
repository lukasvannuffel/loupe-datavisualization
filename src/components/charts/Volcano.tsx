import type { ChartPreviewProps } from "./types";

type VolcanoPoint = {
    x: number;
    y: number;
    sig: boolean;
};

const buildPoints = (): readonly VolcanoPoint[] => {
    const pts: VolcanoPoint[] = [];
    let s = 7;

    for (let i = 0; i < 80; i++) {
        s = (s * 9301 + 49297) % 233280;
        const x = 40 + (s / 233280) * 250;
        s = (s * 9301 + 49297) % 233280;
        const y = 25 + (s / 233280) * 130;
        const sig = Math.abs(x - 165) > 60 && y < 70;
        pts.push({ x, y, sig });
    }

    return pts;
};

const POINTS = buildPoints();

export const Volcano = ({ w, h, responsive }: ChartPreviewProps): JSX.Element => {
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
            <line x1="165" y1="20" x2="165" y2="155" stroke="var(--gray-2)" strokeWidth="0.5" strokeDasharray="2 2" />
            <line x1="40" y1="60" x2="290" y2="60" stroke="var(--gray-2)" strokeWidth="0.5" strokeDasharray="2 2" />
            {POINTS.map((p, i) => (
                <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={p.sig ? 1.8 : 1.2}
                    fill={p.sig ? "var(--ink)" : "var(--gray-2)"}
                    opacity={p.sig ? 0.95 : 0.45}
                />
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
                log₂ FOLD CHANGE
            </text>
        </svg>
    );
};
