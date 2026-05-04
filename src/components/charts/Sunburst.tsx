import type { ChartPreviewProps } from "./types";

type SunburstSegment = {
    depth: number;
    startDeg: number;
    endDeg: number;
};

type SunburstPath = {
    d: string;
    fill: string;
    opacity: number;
};

const CX = 160;
const CY = 92;
const RING_RADII: readonly (readonly [number, number])[] = [
    [12, 32],
    [32, 54],
    [54, 76],
];

const SEGMENTS: readonly SunburstSegment[] = [
    { depth: 0, startDeg: 0, endDeg: 220 },
    { depth: 0, startDeg: 220, endDeg: 360 },

    { depth: 1, startDeg: 0, endDeg: 90 },
    { depth: 1, startDeg: 90, endDeg: 160 },
    { depth: 1, startDeg: 160, endDeg: 220 },
    { depth: 1, startDeg: 220, endDeg: 290 },
    { depth: 1, startDeg: 290, endDeg: 360 },

    { depth: 2, startDeg: 0, endDeg: 38 },
    { depth: 2, startDeg: 38, endDeg: 72 },
    { depth: 2, startDeg: 72, endDeg: 110 },
    { depth: 2, startDeg: 110, endDeg: 144 },
    { depth: 2, startDeg: 144, endDeg: 188 },
    { depth: 2, startDeg: 188, endDeg: 232 },
    { depth: 2, startDeg: 232, endDeg: 270 },
    { depth: 2, startDeg: 270, endDeg: 310 },
    { depth: 2, startDeg: 310, endDeg: 360 },
];

const polarPoint = (cx: number, cy: number, r: number, deg: number): readonly [number, number] => {
    const rad = (deg - 90) * (Math.PI / 180);
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
};

const ringPath = (rInner: number, rOuter: number, startDeg: number, endDeg: number): string => {
    const [x1, y1] = polarPoint(CX, CY, rOuter, startDeg);
    const [x2, y2] = polarPoint(CX, CY, rOuter, endDeg);
    const [x3, y3] = polarPoint(CX, CY, rInner, endDeg);
    const [x4, y4] = polarPoint(CX, CY, rInner, startDeg);
    const largeArc = endDeg - startDeg > 180 ? 1 : 0;

    return (
        `M ${x1} ${y1} ` +
        `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2} ${y2} ` +
        `L ${x3} ${y3} ` +
        `A ${rInner} ${rInner} 0 ${largeArc} 0 ${x4} ${y4} ` +
        `Z`
    );
};

const buildPaths = (): readonly SunburstPath[] =>
    SEGMENTS.map((seg) => {
        const [rIn, rOut] = RING_RADII[seg.depth];
        const opacity = 1 - seg.depth * 0.28;

        return {
            d: ringPath(rIn, rOut, seg.startDeg, seg.endDeg),
            fill: "var(--ink)",
            opacity,
        };
    });

const PATHS = buildPaths();

export const Sunburst = ({ w, h, responsive }: ChartPreviewProps): JSX.Element => {
    const isResponsive = responsive ?? w === undefined;

    return (
        <svg
            viewBox="0 0 320 180"
            width={isResponsive ? "100%" : w}
            height={isResponsive ? undefined : h}
            preserveAspectRatio="xMidYMid meet"
            style={isResponsive ? { display: "block" } : undefined}
        >
            {PATHS.map((p, i) => (
                <path key={i} d={p.d} fill={p.fill} opacity={p.opacity} stroke="var(--paper)" strokeWidth="0.6" />
            ))}
        </svg>
    );
};
