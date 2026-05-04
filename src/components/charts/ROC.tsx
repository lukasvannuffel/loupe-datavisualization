import type { ChartPreviewProps } from "./types";

export const ROC = ({ w, h, responsive }: ChartPreviewProps): JSX.Element => {
    const isResponsive = responsive ?? w === undefined;

    return (
        <svg
            viewBox="0 0 320 180"
            width={isResponsive ? "100%" : w}
            height={isResponsive ? undefined : h}
            preserveAspectRatio="xMidYMid meet"
            style={isResponsive ? { display: "block" } : undefined}
        >
            <line x1="40" y1="155" x2="290" y2="155" stroke="var(--ink)" strokeWidth="0.75" />
            <line x1="40" y1="20" x2="40" y2="155" stroke="var(--ink)" strokeWidth="0.75" />
            <line x1="40" y1="155" x2="290" y2="20" stroke="var(--gray-2)" strokeWidth="0.5" strokeDasharray="2 2" />
            <path d="M40 155 Q 60 80, 120 50 T 290 20" fill="none" stroke="var(--ink)" strokeWidth="1.4" />
            <text
                x="160"
                y="172"
                textAnchor="middle"
                fontSize="9"
                fontFamily="Inter"
                fill="var(--gray)"
                letterSpacing="0.04em"
            >
                FALSE POSITIVE RATE
            </text>
            <text x="240" y="60" fontSize="9" fontFamily="Inter" fill="var(--ink)">
                AUC = 0.87
            </text>
        </svg>
    );
};
