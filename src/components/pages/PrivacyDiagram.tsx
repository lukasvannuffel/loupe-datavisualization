const MAX_DISPLAY_LENGTH = 18;
const MONO_CHAR_WIDTH_AT_9 = 5.4;
const FILE_LOCK_WIDTH = 14;
const FILE_LOCK_GAP = 5;

const estimateMonoWidth = (text: string, fontSize = 9): number =>
    text.length * MONO_CHAR_WIDTH_AT_9 * (fontSize / 9);

type PrivacyDiagramProps = {
    active?: boolean;
    fileName?: string;
    rowCount?: number;
};

const truncateFileName = (name: string): string => {
    if (name.length <= MAX_DISPLAY_LENGTH) {
        return name;
    }

    const dotIndex = name.lastIndexOf(".");

    if (dotIndex > 0) {
        const ext = name.slice(dotIndex);
        const base = name.slice(0, dotIndex);
        const available = MAX_DISPLAY_LENGTH - ext.length - 1;

        return `${base.slice(0, available)}…${ext}`;
    }

    return `${name.slice(0, MAX_DISPLAY_LENGTH - 1)}…`;
};

export const PrivacyDiagram = ({
    active = false,
    fileName,
    rowCount,
}: PrivacyDiagramProps): JSX.Element => {
    const displayName = truncateFileName(fileName ?? "your-data.csv");
    const rowLabel = rowCount !== undefined ? `${rowCount.toLocaleString()} rows` : null;

    const fileBoxCenterX = 94;
    const metadataBoxCenterX = 109;
    const fileNameWidth = estimateMonoWidth(displayName);
    const fileRowStartX =
        fileBoxCenterX - (FILE_LOCK_WIDTH + FILE_LOCK_GAP + fileNameWidth) / 2;
    const lockLeftX = fileRowStartX;
    const fileNameX = lockLeftX + FILE_LOCK_WIDTH + FILE_LOCK_GAP;

    const rowPart = rowLabel !== null ? ` (${rowLabel})` : "";
    const ariaLabel =
        `Privacy flow: ${displayName}${rowPart} stays in your browser. ` +
        `Only derived metadata — column names, types, and row count — is sent to the AI for chart recommendation.`;

    return (
        <svg
            key={fileName ?? "empty"}
            viewBox="0 0 320 200"
            className="privacy-diag-svg"
            role="img"
            aria-label={ariaLabel}
        >
            {/* ── Browser container ── */}
            <rect
                x="10"
                y="24"
                width="200"
                height="152"
                fill="none"
                stroke="var(--ink)"
                strokeWidth="0.8"
                rx="2"
            />
            <text
                x="10"
                y="15"
                className="privacy-diag-eyebrow"
                fontSize="8.5"
                fontFamily="Inter, sans-serif"
                fill="var(--gray)"
                letterSpacing="0.14em"
            >
                YOUR BROWSER
            </text>

            {/* ── File box — rows never leave ── */}
            <rect
                x="20"
                y="38"
                width="148"
                height="62"
                fill={active ? "var(--paper-2)" : "none"}
                stroke={active ? "var(--ink)" : "var(--hairline-strong)"}
                strokeWidth="0.7"
                rx="1"
            />

            {/* Lock icon + filename — centered as a row */}
            <path
                d={`M${lockLeftX + 2},56 L${lockLeftX + 2},52 Q${lockLeftX + 2},48 ${lockLeftX + 6},48 Q${lockLeftX + 10},48 ${lockLeftX + 10},52 L${lockLeftX + 10},56`}
                fill="none"
                stroke="var(--gray)"
                strokeWidth="0.9"
                strokeLinecap="round"
            />
            <rect
                x={lockLeftX}
                y="56"
                width="12"
                height="9"
                fill="none"
                stroke="var(--gray)"
                strokeWidth="0.9"
                rx="1"
            />

            {/* Filename */}
            <text
                x={fileNameX}
                y="57"
                fontSize="9"
                fontFamily="JetBrains Mono, monospace"
                fill="var(--ink)"
            >
                {displayName}
            </text>

            {/* Row count — only shown when a file has been loaded */}
            {rowLabel !== null && (
                <text
                    x={fileBoxCenterX}
                    y="70"
                    textAnchor="middle"
                    fontSize="8.5"
                    fontFamily="JetBrains Mono, monospace"
                    fill="var(--gray)"
                >
                    {rowLabel}
                </text>
            )}

            {/* Divider within file box */}
            <line
                x1="24"
                y1="78"
                x2="164"
                y2="78"
                stroke="var(--hairline)"
                strokeWidth="0.5"
            />

            {/* "stays here" — present in both empty and loaded states */}
            <text
                x={fileBoxCenterX}
                y="93"
                textAnchor="middle"
                fontSize="8.5"
                fontFamily="Inter, sans-serif"
                fontStyle="italic"
                fill="var(--gray-2)"
            >
                stays here
            </text>

            {/* ── Derived metadata box — what does leave ── */}

            {/* Amber accent on left edge signals outbound data */}
            <line
                x1="18"
                y1="110"
                x2="18"
                y2="166"
                stroke="var(--amber)"
                strokeWidth="2"
            />
            <rect
                x="20"
                y="110"
                width="178"
                height="56"
                fill="var(--paper-2)"
                stroke="var(--hairline-strong)"
                strokeWidth="0.7"
                rx="1"
            />
            <text
                x={metadataBoxCenterX}
                y="123"
                textAnchor="middle"
                fontSize="7.5"
                fontFamily="Inter, sans-serif"
                fill="var(--gray)"
                letterSpacing="0.12em"
            >
                DERIVED METADATA
            </text>
            <text
                x={metadataBoxCenterX}
                y="140"
                textAnchor="middle"
                fontSize="8"
                fontFamily="JetBrains Mono, monospace"
                fill="var(--ink)"
            >
                column names · types · row count
            </text>

            {/* ── Arrow: derived metadata → AI ──
                Dashed line exits the browser container wall and reaches the AI circle.
                Origin at the metadata box right edge clarifies what is moving. */}
            <line
                x1="198"
                y1="138"
                x2="256"
                y2="138"
                stroke="var(--amber)"
                strokeWidth="0.8"
                strokeDasharray="2 2"
            />
            <path
                d="M 256 134 L 264 138 L 256 142"
                fill="var(--amber)"
            />

            {/* Gateway packet — rides along the arrow when active */}
            <rect
                x="210"
                y="132"
                width="16"
                height="12"
                fill="var(--paper)"
                stroke="var(--amber)"
                strokeWidth="0.8"
                rx="1"
                opacity={active ? 1 : 0.4}
            >
                {active && (
                    <animate
                        attributeName="x"
                        from="198"
                        to="238"
                        dur="1.2s"
                        begin="0s"
                        fill="freeze"
                        repeatCount="1"
                    />
                )}
            </rect>

            {/* ── AI circle ── */}
            <circle
                cx="284"
                cy="138"
                r="22"
                fill="none"
                stroke="var(--ink)"
                strokeWidth="0.8"
            />
            <text
                x="284"
                y="143"
                textAnchor="middle"
                fontSize="10"
                fontFamily="JetBrains Mono, monospace"
                fill="var(--ink)"
            >
                AI
            </text>
            <text
                x="284"
                y="172"
                textAnchor="middle"
                fontSize="8.5"
                fontFamily="Inter, sans-serif"
                fill="var(--gray)"
                letterSpacing="0.1em"
            >
                REASONING
            </text>
        </svg>
    );
};
