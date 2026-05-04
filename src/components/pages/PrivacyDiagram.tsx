type PrivacyDiagramProps = {
    active?: boolean;
};

export const PrivacyDiagram = ({ active = false }: PrivacyDiagramProps): JSX.Element => (
    <svg viewBox="0 0 320 200" className="privacy-diag-svg">
        <rect x="14" y="34" width="210" height="150" fill="none" stroke="var(--ink)" strokeWidth="0.8" rx="2" />
        <text x="14" y="26" fontSize="9.5" fontFamily="Inter" fill="var(--gray)" letterSpacing="0.14em">
            YOUR BROWSER
        </text>

        <rect
            x="34"
            y="62"
            width="78"
            height="50"
            fill={active ? "var(--paper-2)" : "none"}
            stroke="var(--ink)"
            strokeWidth="0.7"
        />
        <text
            x="73"
            y="84"
            textAnchor="middle"
            fontSize="9"
            fontFamily="JetBrains Mono, monospace"
            fill="var(--ink)"
        >
            trial.csv
        </text>
        <text
            x="73"
            y="98"
            textAnchor="middle"
            fontSize="8"
            fontFamily="JetBrains Mono, monospace"
            fill="var(--gray)"
        >
            2,418 rows
        </text>
        <text x="73" y="124" textAnchor="middle" fontSize="9" fontFamily="Inter" fill="var(--ink)">
            stays here
        </text>

        <rect x="34" y="138" width="178" height="34" fill="var(--paper-2)" stroke="var(--hairline-strong)" strokeWidth="0.7" />
        <text x="42" y="152" fontSize="8" fontFamily="Inter" fill="var(--gray)" letterSpacing="0.1em">
            DERIVED METADATA
        </text>
        <text x="42" y="166" fontSize="9.5" fontFamily="JetBrains Mono, monospace" fill="var(--ink)">
            column names · types · row count
        </text>

        <circle cx="280" cy="108" r="22" fill="none" stroke="var(--ink)" strokeWidth="0.8" />
        <text
            x="280"
            y="112"
            textAnchor="middle"
            fontSize="10"
            fontFamily="JetBrains Mono, monospace"
            fill="var(--ink)"
        >
            AI
        </text>
        <text
            x="280"
            y="146"
            textAnchor="middle"
            fontSize="9"
            fontFamily="Inter"
            fill="var(--gray)"
            letterSpacing="0.1em"
        >
            REASONING
        </text>

        <line
            x1="224"
            y1="108"
            x2="258"
            y2="108"
            stroke="var(--ink)"
            strokeWidth="0.6"
            strokeDasharray="2 2"
        />

        <g style={{ opacity: active ? 1 : 0.55, transition: "opacity 400ms ease" }}>
            <rect x="226" y="102" width="20" height="12" fill="var(--paper)" stroke="var(--amber)" strokeWidth="0.8">
                {active && (
                    <animate attributeName="x" from="120" to="226" dur="1.4s" begin="0.4s" fill="freeze" />
                )}
            </rect>
        </g>

        <line
            x1="14"
            y1="184"
            x2="224"
            y2="184"
            stroke="var(--hairline-strong)"
            strokeWidth="0.5"
            strokeDasharray="1 2"
        />
    </svg>
);
