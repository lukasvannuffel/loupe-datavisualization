type MarkerLegendGlyphProps = {
    readonly color: string;
    readonly shapePath: string;
};

export const MarkerLegendGlyph = ({ color, shapePath }: MarkerLegendGlyphProps): JSX.Element => (
    <svg
        aria-hidden="true"
        className="chart-legend-glyph"
        data-role="legend-glyph-marker"
        height={12}
        viewBox="0 0 12 12"
        width={12}
    >
        <path d={shapePath} fill={color} transform="translate(6,6)" />
    </svg>
);
