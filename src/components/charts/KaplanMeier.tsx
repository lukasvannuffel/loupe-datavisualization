import type { KaplanMeierProps } from "./types";

export const KaplanMeier = ({
    w,
    h,
    responsive,
    animated = false,
    accent = false,
}: KaplanMeierProps): JSX.Element => {
    const isResponsive = responsive ?? w === undefined;
    const A = "M20 30 H60 V42 H100 V58 H140 V70 H180 V78 H220 V92 H260 V100 H300";
    const B = "M20 30 H50 V50 H80 V70 H120 V90 H160 V108 H200 V124 H240 V138 H300";

    return (
        <svg
            viewBox="0 0 320 180"
            width={isResponsive ? "100%" : w}
            height={isResponsive ? undefined : h}
            preserveAspectRatio="xMidYMid meet"
            style={isResponsive ? { overflow: "visible", display: "block" } : { overflow: "visible" }}
        >
            <line x1="20" y1="160" x2="300" y2="160" stroke="var(--ink)" strokeWidth="0.75" />
            <line x1="20" y1="20" x2="20" y2="160" stroke="var(--ink)" strokeWidth="0.75" />
            {[40, 70, 100, 130].map((y) => (
                <line
                    key={y}
                    x1="20"
                    y1={y}
                    x2="300"
                    y2={y}
                    stroke="var(--hairline)"
                    strokeWidth="0.5"
                    strokeDasharray="2 3"
                />
            ))}
            <path d={A} fill="none" stroke="var(--ink)" strokeWidth="1.4">
                {animated && (
                    <animate attributeName="stroke-dasharray" from="0 600" to="600 0" dur="1.4s" fill="freeze" />
                )}
            </path>
            <path
                d={B}
                fill="none"
                stroke={accent ? "var(--amber)" : "var(--gray)"}
                strokeWidth="1.4"
                strokeDasharray={accent ? undefined : "3 2"}
            >
                {animated && (
                    <animate
                        attributeName="stroke-dasharray"
                        from="0 600"
                        to="600 0"
                        dur="1.4s"
                        begin="0.3s"
                        fill="freeze"
                    />
                )}
            </path>
            {[
                [60, 42],
                [140, 70],
                [220, 92],
            ].map(([x, y], i) => (
                <line
                    key={i}
                    x1={x}
                    y1={y - 4}
                    x2={x}
                    y2={y + 4}
                    stroke="var(--ink)"
                    strokeWidth="0.75"
                />
            ))}
            <text
                x="160"
                y="178"
                textAnchor="middle"
                fontSize="9"
                fontFamily="Inter"
                fill="var(--gray)"
                letterSpacing="0.04em"
            >
                MONTHS SINCE RANDOMIZATION
            </text>
            <text
                x="8"
                y="90"
                textAnchor="middle"
                fontSize="9"
                fontFamily="Inter"
                fill="var(--gray)"
                letterSpacing="0.04em"
                transform="rotate(-90 8 90)"
            >
                SURVIVAL PROBABILITY
            </text>
        </svg>
    );
};
