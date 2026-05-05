import type { ChartPreviewProps } from "./types";

type ScatterPoint = {
    x: number;
    y: number;
};

const REG_X1 = 50;
const REG_X2 = 280;
const REG_SLOPE = -0.4;
const REG_INTERCEPT_Y = 138;

const buildPoints = (): readonly ScatterPoint[] => {
    const pts: ScatterPoint[] = [];
    let s = 23;

    for (let i = 0; i < 50; i++) {
        s = (s * 9301 + 49297) % 233280;
        const xRand = s / 233280;
        s = (s * 9301 + 49297) % 233280;
        const yRand = s / 233280;
        const x = REG_X1 + xRand * (REG_X2 - REG_X1);
        const yIdeal = REG_INTERCEPT_Y + REG_SLOPE * (x - REG_X1);
        const y = yIdeal + (yRand - 0.5) * 56;
        pts.push({ x, y });
    }

    return pts;
};

const POINTS = buildPoints();
const REG_Y1 = REG_INTERCEPT_Y;
const REG_Y2 = REG_INTERCEPT_Y + REG_SLOPE * (REG_X2 - REG_X1);

export const Scatter = ({ w, h, responsive }: ChartPreviewProps): JSX.Element => {
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
            {POINTS.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="1.8" fill="none" stroke="var(--ink)" strokeWidth="0.7" />
            ))}
            <line
                x1={REG_X1}
                y1={REG_Y1}
                x2={REG_X2}
                y2={REG_Y2}
                stroke="var(--ink)"
                strokeWidth="1.1"
                strokeDasharray="2 2"
                opacity="0.85"
            />
            <text x="240" y="46" fontSize="9" fontFamily="Inter" fill="var(--ink)">
                r = 0.62
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
                BASELINE BIOMARKER
            </text>
        </svg>
    );
};
