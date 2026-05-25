type BoxLegendGlyphProps = {
    readonly color: string;
    readonly useEditorialFill: boolean;
};

export const BoxLegendGlyph = ({ color, useEditorialFill }: BoxLegendGlyphProps): JSX.Element => (
    <svg
        aria-hidden="true"
        className="chart-legend-glyph"
        data-role="legend-glyph-box"
        height={12}
        viewBox="0 0 12 12"
        width={12}
    >
        <rect
            fill={useEditorialFill ? "var(--paper)" : color}
            fillOpacity={useEditorialFill ? 1 : 0.2}
            height={8}
            stroke="var(--ink)"
            strokeWidth={0.75}
            width={10}
            x={1}
            y={2}
        />
    </svg>
);
