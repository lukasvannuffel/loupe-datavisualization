type BarLegendGlyphProps = {
    readonly color: string;
};

export const BarLegendGlyph = ({ color }: BarLegendGlyphProps): JSX.Element => (
    <svg
        aria-hidden="true"
        className="chart-legend-glyph"
        data-role="legend-glyph-bar"
        height={12}
        viewBox="0 0 12 12"
        width={12}
    >
        <rect fill={color} height={8} opacity={0.85} width={10} x={1} y={2} />
    </svg>
);
