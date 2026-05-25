/**
 * SVG path-d strings for scatter marker shapes by group index.
 * Each path centered at (0, 0), drawn as filled glyph with size r=4.
 * Caller translates to (x, y) via the parent <g transform>.
 */
const r = 4;

export const MARKER_BY_INDEX: readonly string[] = [
    `M 0,-${r} A ${r},${r} 0 1,1 0,${r} A ${r},${r} 0 1,1 0,-${r} Z`,
    `M -${r},-${r} L ${r},-${r} L ${r},${r} L -${r},${r} Z`,
    `M 0,-${r} L ${r},${r} L -${r},${r} Z`,
    `M 0,-${r} L ${r},0 L 0,${r} L -${r},0 Z`,
] as const;
