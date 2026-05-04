type PValueLabelProps = {
    x: number;
    y: number;
    pValue: number;
    color?: string;
};

export const PValueLabel = ({
    x,
    y,
    pValue,
    color = "var(--gray)",
}: PValueLabelProps): JSX.Element => {
    const decimals = pValue < 0.001 ? 4 : 3;
    const text = pValue < 0.0001 ? "p < 0.0001" : `p = ${pValue.toFixed(decimals)}`;

    return (
        <text
            x={x}
            y={y}
            textAnchor="middle"
            fontSize="10.5"
            fontFamily="Inter"
            fill={color}
        >
            {text}
        </text>
    );
};
