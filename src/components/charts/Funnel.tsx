import type { ChartPreviewProps } from "./types";

type FunnelPoint = {
    x: number;
    y: number;
};

const buildPoints = (): readonly FunnelPoint[] => {
    const pts: FunnelPoint[] = [];
    let s = 5;

    for (let i = 0; i < 26; i++) {
        s = (s * 9301 + 49297) % 233280;
        const x = 80 + (s / 233280) * 160;
        s = (s * 9301 + 49297) % 233280;
        const y = 30 + (s / 233280) * 120;
        pts.push({ x, y });
    }

    return pts;
};

const POINTS = buildPoints();

export const Funnel = ({ w, h, responsive }: ChartPreviewProps): JSX.Element => {
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
            <line x1="160" y1="20" x2="50" y2="150" stroke="var(--gray-2)" strokeWidth="0.6" strokeDasharray="2 2" />
            <line x1="160" y1="20" x2="270" y2="150" stroke="var(--gray-2)" strokeWidth="0.6" strokeDasharray="2 2" />
            <line x1="160" y1="20" x2="160" y2="155" stroke="var(--ink)" strokeWidth="0.6" />
            {POINTS.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="1.8" fill="none" stroke="var(--ink)" strokeWidth="0.7" />
            ))}
        </svg>
    );
};
