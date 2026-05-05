import type { ChartPreviewProps } from "./types";

type SliceSource = {
    value: number;
    fill: string;
    label: string;
};

type SlicePath = {
    d: string;
    fill: string;
    label: string;
    midDeg: number;
};

const CX = 160;
const CY = 92;
const R = 60;

const SOURCE: readonly SliceSource[] = [
    { value: 0.42, fill: "var(--ink)", label: "Lung" },
    { value: 0.28, fill: "var(--gray)", label: "Breast" },
    { value: 0.2, fill: "var(--gray-2)", label: "Colon" },
    { value: 0.1, fill: "var(--amber)", label: "Other" },
];

const polarPoint = (cx: number, cy: number, r: number, deg: number): readonly [number, number] => {
    const rad = (deg - 90) * (Math.PI / 180);
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
};

const buildSlices = (): readonly SlicePath[] => {
    const out: SlicePath[] = [];
    let cumDeg = 0;

    for (const s of SOURCE) {
        const startDeg = cumDeg;
        const endDeg = cumDeg + s.value * 360;
        const [x1, y1] = polarPoint(CX, CY, R, startDeg);
        const [x2, y2] = polarPoint(CX, CY, R, endDeg);
        const largeArc = endDeg - startDeg > 180 ? 1 : 0;
        const d = `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} Z`;
        out.push({ d, fill: s.fill, label: s.label, midDeg: (startDeg + endDeg) / 2 });
        cumDeg = endDeg;
    }

    return out;
};

const SLICES = buildSlices();

export const Pie = ({ w, h, responsive }: ChartPreviewProps): JSX.Element => {
    const isResponsive = responsive ?? w === undefined;

    return (
        <svg
            viewBox="0 0 320 180"
            width={isResponsive ? "100%" : w}
            height={isResponsive ? undefined : h}
            preserveAspectRatio="xMidYMid meet"
            style={isResponsive ? { display: "block" } : undefined}
        >
            {SLICES.map((s, i) => {
                const [labelX, labelY] = polarPoint(CX, CY, R + 12, s.midDeg);
                const anchor = labelX < CX - 4 ? "end" : labelX > CX + 4 ? "start" : "middle";

                return (
                    <g key={i}>
                        <path d={s.d} fill={s.fill} stroke="var(--paper)" strokeWidth="1" />
                        <text
                            x={labelX}
                            y={labelY + 3}
                            textAnchor={anchor}
                            fontSize="8"
                            fontFamily="Inter"
                            fill="var(--gray)"
                        >
                            {s.label}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
};
