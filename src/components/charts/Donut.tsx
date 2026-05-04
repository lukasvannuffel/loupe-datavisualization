import type { ChartPreviewProps } from "./types";

type SliceSource = {
    value: number;
    fill: string;
};

type RingSlice = {
    d: string;
    fill: string;
};

const CX = 160;
const CY = 92;
const R_OUTER = 60;
const R_INNER = 36;

const SOURCE: readonly SliceSource[] = [
    { value: 0.64, fill: "var(--ink)" },
    { value: 0.18, fill: "var(--gray)" },
    { value: 0.12, fill: "var(--gray-2)" },
    { value: 0.06, fill: "var(--amber)" },
];

const polarPoint = (cx: number, cy: number, r: number, deg: number): readonly [number, number] => {
    const rad = (deg - 90) * (Math.PI / 180);
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
};

const buildRing = (): readonly RingSlice[] => {
    const out: RingSlice[] = [];
    let cumDeg = 0;

    for (const s of SOURCE) {
        const startDeg = cumDeg;
        const endDeg = cumDeg + s.value * 360;
        const [x1, y1] = polarPoint(CX, CY, R_OUTER, startDeg);
        const [x2, y2] = polarPoint(CX, CY, R_OUTER, endDeg);
        const [x3, y3] = polarPoint(CX, CY, R_INNER, endDeg);
        const [x4, y4] = polarPoint(CX, CY, R_INNER, startDeg);
        const largeArc = endDeg - startDeg > 180 ? 1 : 0;
        const d =
            `M ${x1} ${y1} ` +
            `A ${R_OUTER} ${R_OUTER} 0 ${largeArc} 1 ${x2} ${y2} ` +
            `L ${x3} ${y3} ` +
            `A ${R_INNER} ${R_INNER} 0 ${largeArc} 0 ${x4} ${y4} ` +
            `Z`;
        out.push({ d, fill: s.fill });
        cumDeg = endDeg;
    }

    return out;
};

const SLICES = buildRing();

export const Donut = ({ w, h, responsive }: ChartPreviewProps): JSX.Element => {
    const isResponsive = responsive ?? w === undefined;

    return (
        <svg
            viewBox="0 0 320 180"
            width={isResponsive ? "100%" : w}
            height={isResponsive ? undefined : h}
            preserveAspectRatio="xMidYMid meet"
            style={isResponsive ? { display: "block" } : undefined}
        >
            {SLICES.map((s, i) => (
                <path key={i} d={s.d} fill={s.fill} stroke="var(--paper)" strokeWidth="1" />
            ))}
            <text
                x={CX}
                y={CY + 2}
                textAnchor="middle"
                fontSize="22"
                fontFamily="Inter"
                fontWeight="500"
                fill="var(--ink)"
            >
                64%
            </text>
            <text
                x={CX}
                y={CY + 16}
                textAnchor="middle"
                fontSize="8"
                fontFamily="Inter"
                fill="var(--gray)"
                letterSpacing="0.04em"
            >
                RESPONSE
            </text>
        </svg>
    );
};
