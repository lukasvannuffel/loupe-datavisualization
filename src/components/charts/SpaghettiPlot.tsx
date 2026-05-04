import type { ChartPreviewProps } from "./types";

const buildLines = (): readonly string[] => {
    const lines: string[] = [];
    let s = 3;

    for (let i = 0; i < 9; i++) {
        let path = "";
        for (let x = 0; x <= 5; x++) {
            s = (s * 9301 + 49297) % 233280;
            const y = 40 + (s / 233280) * 100;
            path += `${x === 0 ? "M" : "L"} ${30 + x * 50} ${y} `;
        }
        lines.push(path);
    }

    return lines;
};

const LINES = buildLines();

export const SpaghettiPlot = ({ w, h, responsive }: ChartPreviewProps): JSX.Element => {
    const isResponsive = responsive ?? w === undefined;

    return (
        <svg
            viewBox="0 0 320 180"
            width={isResponsive ? "100%" : w}
            height={isResponsive ? undefined : h}
            preserveAspectRatio="xMidYMid meet"
            style={isResponsive ? { display: "block" } : undefined}
        >
            <line x1="30" y1="155" x2="290" y2="155" stroke="var(--ink)" strokeWidth="0.75" />
            <line x1="30" y1="20" x2="30" y2="155" stroke="var(--ink)" strokeWidth="0.75" />
            {LINES.map((d, i) => (
                <path key={i} d={d} fill="none" stroke="var(--ink)" strokeWidth="0.7" opacity={0.4 + i * 0.05} />
            ))}
        </svg>
    );
};
