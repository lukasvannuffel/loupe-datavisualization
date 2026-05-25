type LineLegendGlyphProps = {
    readonly color: string;
    readonly dash: string;
    readonly shapePath?: string;
    readonly withMarker?: boolean;
};

export const LineLegendGlyph = ({
    color,
    dash,
    shapePath,
    withMarker = false,
}: LineLegendGlyphProps): JSX.Element => (
    <svg
        aria-hidden="true"
        className="chart-legend-glyph"
        data-role="legend-glyph-line"
        height={12}
        viewBox="0 0 12 12"
        width={12}
    >
        <line
            stroke={color}
            strokeDasharray={dash.length > 0 ? dash : undefined}
            strokeWidth={1.5}
            x1={1}
            x2={11}
            y1={6}
            y2={6}
        />
        {withMarker && shapePath !== undefined ? (
            <path d={shapePath} fill={color} transform="translate(6,6)" />
        ) : null}
    </svg>
);
