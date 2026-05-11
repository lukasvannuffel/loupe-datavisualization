import {
    SEMANTIC_TAG_LABEL,
    type PrimaryType,
    type SemanticTag,
} from "@/lib/parser/inference.types";

type TypeBadgeProps = {
    readonly primaryType: PrimaryType;
    readonly semanticTag?: SemanticTag;
    readonly detail?: string;
};

/** Spoken form for assistive tech — distinguishes the semantic tag from any chart-role pick. */
const SEMANTIC_TAG_ARIA: Readonly<Record<SemanticTag, string>> = {
    "time-to-event": "time to event",
    "event-status": "event status",
    "patient-id": "patient identifier",
};

export const TypeBadge = ({ primaryType, semanticTag, detail }: TypeBadgeProps): JSX.Element => (
    <div className="type-cell">
        <div className="type-badges">
            <span className="type-badge">{primaryType}</span>
            {semanticTag !== undefined && (
                <span
                    className="type-badge type-badge--accent"
                    aria-label={`semantic tag: ${SEMANTIC_TAG_ARIA[semanticTag]}`}
                >
                    {SEMANTIC_TAG_LABEL[semanticTag]}
                </span>
            )}
        </div>
        {detail !== undefined && <span className="type-detail muted mono">{detail}</span>}
    </div>
);
