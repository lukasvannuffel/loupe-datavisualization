import type { ChartPreviewProps } from "./types";

type SankeyNode = {
    x: number;
    y: number;
    h: number;
    label: string;
};

type SankeyFlow = {
    fromStage: number;
    fromIdx: number;
    fromOffset: number;
    toStage: number;
    toIdx: number;
    toOffset: number;
    weight: number;
};

const NODE_WIDTH = 7;

const NODES: readonly (readonly SankeyNode[])[] = [
    [
        { x: 50, y: 30, h: 38, label: "Referral" },
        { x: 50, y: 76, h: 50, label: "Self" },
        { x: 50, y: 134, h: 22, label: "ER" },
    ],
    [
        { x: 160, y: 30, h: 30, label: "Stage I" },
        { x: 160, y: 68, h: 56, label: "Stage II" },
        { x: 160, y: 132, h: 24, label: "Stage III" },
    ],
    [
        { x: 270, y: 30, h: 50, label: "Response" },
        { x: 270, y: 88, h: 38, label: "Stable" },
        { x: 270, y: 134, h: 22, label: "Progress" },
    ],
];

const FLOWS: readonly SankeyFlow[] = [
    { fromStage: 0, fromIdx: 0, fromOffset: 6, toStage: 1, toIdx: 0, toOffset: 5, weight: 14 },
    { fromStage: 0, fromIdx: 0, fromOffset: 22, toStage: 1, toIdx: 1, toOffset: 6, weight: 22 },
    { fromStage: 0, fromIdx: 1, fromOffset: 12, toStage: 1, toIdx: 1, toOffset: 30, weight: 26 },
    { fromStage: 0, fromIdx: 1, fromOffset: 36, toStage: 1, toIdx: 2, toOffset: 4, weight: 18 },
    { fromStage: 0, fromIdx: 2, fromOffset: 8, toStage: 1, toIdx: 2, toOffset: 14, weight: 12 },

    { fromStage: 1, fromIdx: 0, fromOffset: 6, toStage: 2, toIdx: 0, toOffset: 4, weight: 16 },
    { fromStage: 1, fromIdx: 1, fromOffset: 8, toStage: 2, toIdx: 0, toOffset: 22, weight: 22 },
    { fromStage: 1, fromIdx: 1, fromOffset: 32, toStage: 2, toIdx: 1, toOffset: 6, weight: 18 },
    { fromStage: 1, fromIdx: 2, fromOffset: 6, toStage: 2, toIdx: 1, toOffset: 22, weight: 12 },
    { fromStage: 1, fromIdx: 2, fromOffset: 18, toStage: 2, toIdx: 2, toOffset: 6, weight: 14 },
];

const buildFlowPath = (flow: SankeyFlow): string => {
    const from = NODES[flow.fromStage][flow.fromIdx];
    const to = NODES[flow.toStage][flow.toIdx];
    const x1 = from.x + NODE_WIDTH;
    const y1 = from.y + flow.fromOffset;
    const x2 = to.x;
    const y2 = to.y + flow.toOffset;
    const cx = (x1 + x2) / 2;

    return `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
};

const FLOW_PATHS = FLOWS.map((flow) => ({
    d: buildFlowPath(flow),
    weight: flow.weight,
}));

export const Sankey = ({ w, h, responsive }: ChartPreviewProps): JSX.Element => {
    const isResponsive = responsive ?? w === undefined;

    return (
        <svg
            viewBox="0 0 320 180"
            width={isResponsive ? "100%" : w}
            height={isResponsive ? undefined : h}
            preserveAspectRatio="xMidYMid meet"
            style={isResponsive ? { display: "block" } : undefined}
        >
            {FLOW_PATHS.map((flow, i) => (
                <path
                    key={i}
                    d={flow.d}
                    fill="none"
                    stroke="var(--ink)"
                    strokeWidth={flow.weight}
                    strokeOpacity="0.18"
                    strokeLinecap="butt"
                />
            ))}
            {NODES.flatMap((stage, stageIdx) =>
                stage.map((node, nodeIdx) => (
                    <g key={`${stageIdx}-${nodeIdx}`}>
                        <rect
                            x={node.x}
                            y={node.y}
                            width={NODE_WIDTH}
                            height={node.h}
                            fill="var(--ink)"
                        />
                        <text
                            x={stageIdx === 2 ? node.x - 4 : node.x + NODE_WIDTH + 4}
                            y={node.y + node.h / 2 + 3}
                            textAnchor={stageIdx === 2 ? "end" : "start"}
                            fontSize="8"
                            fontFamily="Inter"
                            fill="var(--gray)"
                        >
                            {node.label}
                        </text>
                    </g>
                )),
            )}
        </svg>
    );
};
