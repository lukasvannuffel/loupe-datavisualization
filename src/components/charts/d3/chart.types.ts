export type Dimensions = { readonly width: number; readonly height: number };

export type Margin = {
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
    readonly left: number;
};

export const DEFAULT_MARGIN: Margin = { top: 16, right: 16, bottom: 60, left: 48 };

export type ChartDrawContext = {
    readonly svg: SVGSVGElement;
    readonly dimensions: Dimensions;
    readonly margin: Margin;
    readonly innerWidth: number;
    readonly innerHeight: number;
};
