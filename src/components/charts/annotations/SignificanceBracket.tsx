type SignificanceBracketProps = {
    xFrom: number;
    xTo: number;
    y: number;
    label: "*" | "**" | "***" | "ns";
    pValue?: number;
    color?: string;
    strokeWeight?: number;
};

export const SignificanceBracket = ({
    xFrom,
    xTo,
    y,
    label,
    pValue,
    color = "var(--ink)",
    strokeWeight = 0.8,
}: SignificanceBracketProps): JSX.Element => {
    const tickHeight = 5;
    const labelOffset = 4;
    const showPValue = typeof pValue === "number" && label !== "ns";

    return (
        <g>
            <line
                x1={xFrom}
                x2={xFrom}
                y1={y}
                y2={y + tickHeight}
                stroke={color}
                strokeWidth={strokeWeight}
            />
            <line
                x1={xFrom}
                x2={xTo}
                y1={y}
                y2={y}
                stroke={color}
                strokeWidth={strokeWeight}
            />
            <line
                x1={xTo}
                x2={xTo}
                y1={y}
                y2={y + tickHeight}
                stroke={color}
                strokeWidth={strokeWeight}
            />
            <text
                x={(xFrom + xTo) / 2}
                y={y - labelOffset}
                textAnchor="middle"
                fontSize="11"
                fontFamily="Inter"
                fill={color}
            >
                {label}
            </text>
            {showPValue && (
                <text
                    x={(xFrom + xTo) / 2}
                    y={y - labelOffset - 11}
                    textAnchor="middle"
                    fontSize="9.5"
                    fontFamily="Inter"
                    fill="var(--gray)"
                >
                    p = {pValue!.toFixed(pValue! < 0.001 ? 4 : 3)}
                </text>
            )}
        </g>
    );
};
