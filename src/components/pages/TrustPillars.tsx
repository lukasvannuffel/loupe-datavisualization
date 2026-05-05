import { BoxPlot } from "@/components/charts/BoxPlot";
import { ForestPlot } from "@/components/charts/ForestPlot";
import { KaplanMeier } from "@/components/charts/KaplanMeier";
import { Volcano } from "@/components/charts/Volcano";

export const TrustPillarPrivacy = (): JSX.Element => (
    <svg viewBox="0 0 280 160" width="100%" style={{ display: "block" }}>
        <rect x="20" y="30" width="240" height="110" fill="none" stroke="var(--ink)" strokeWidth="0.8" rx="2" />
        <text x="20" y="22" fontSize="9" fontFamily="Inter" fill="var(--gray)" letterSpacing="0.12em">
            YOUR BROWSER
        </text>
        <rect x="40" y="60" width="60" height="44" fill="none" stroke="var(--ink)" strokeWidth="0.7" />
        <text
            x="70"
            y="86"
            textAnchor="middle"
            fontSize="9"
            fontFamily="JetBrains Mono, monospace"
            fill="var(--ink)"
        >
            trial.csv
        </text>
        <text x="70" y="116" textAnchor="middle" fontSize="8" fontFamily="Inter" fill="var(--gray)">
            stays here
        </text>
        <circle cx="240" cy="82" r="10" fill="none" stroke="var(--ink)" strokeWidth="0.7" />
        <text
            x="240"
            y="86"
            textAnchor="middle"
            fontSize="9"
            fontFamily="JetBrains Mono, monospace"
            fill="var(--ink)"
        >
            AI
        </text>
        <line
            x1="106"
            y1="82"
            x2="226"
            y2="82"
            stroke="var(--ink)"
            strokeWidth="0.6"
            strokeDasharray="2 2"
        />
        <rect x="148" y="74" width="44" height="16" fill="var(--paper)" stroke="var(--amber)" strokeWidth="0.7" />
        <text
            x="170"
            y="85"
            textAnchor="middle"
            fontSize="8"
            fontFamily="JetBrains Mono, monospace"
            fill="var(--amber)"
        >
            schema + intent
        </text>
    </svg>
);

const REASONING_LABELS: readonly string[] = ["BECAUSE", "WE CONSIDERED", "WE CHOSE"];
const REASONING_VALUES: readonly string[] = [
    "time-to-event with censoring",
    "forest plot, log-rank table",
    "Kaplan–Meier curve",
];

export const TrustPillarReasoning = (): JSX.Element => (
    <svg viewBox="0 0 280 160" width="100%">
        <rect x="20" y="20" width="240" height="120" fill="none" stroke="var(--hairline-strong)" strokeWidth="0.6" rx="2" />
        {[0, 1, 2].map((i) => (
            <g key={i}>
                <line
                    x1="32"
                    y1={48 + i * 26}
                    x2="42"
                    y2={48 + i * 26}
                    stroke="var(--ink)"
                    strokeWidth="0.8"
                />
                <line
                    x1="50"
                    y1={48 + i * 26}
                    x2="240"
                    y2={48 + i * 26}
                    stroke="var(--hairline-strong)"
                    strokeWidth="0.5"
                />
                <text
                    x="50"
                    y={45 + i * 26}
                    fontSize="8"
                    fontFamily="Inter"
                    fill="var(--gray)"
                    letterSpacing="0.08em"
                >
                    {REASONING_LABELS[i]}
                </text>
                <text
                    x="50"
                    y={56 + i * 26}
                    fontSize="10.5"
                    fontFamily="Source Serif 4, Georgia, serif"
                    fill="var(--ink)"
                >
                    {REASONING_VALUES[i]}
                </text>
            </g>
        ))}
    </svg>
);

export const TrustPillarFormats = (): JSX.Element => (
    <svg viewBox="0 0 280 160" width="100%">
        <g transform="translate(20,30)">
            <KaplanMeier w={120} h={68} />
        </g>
        <g transform="translate(140,30)">
            <ForestPlot w={120} h={68} />
        </g>
        <g transform="translate(20,90)">
            <BoxPlot w={120} h={68} />
        </g>
        <g transform="translate(140,90)">
            <Volcano w={120} h={68} />
        </g>
    </svg>
);
