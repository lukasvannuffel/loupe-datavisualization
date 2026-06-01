import { Eyebrow } from "@/components/primitives/Eyebrow";

type RecommendationIntentBandProps = {
    readonly fromCache: boolean;
    readonly phase: number;
    readonly transformChart: string;
    readonly transformVerb: string;
    readonly words: readonly string[];
};

export const RecommendationIntentBand = ({
    fromCache,
    phase,
    transformChart,
    transformVerb,
    words,
}: RecommendationIntentBandProps): JSX.Element => (
    <div className="rec-intent-band">
        <div className="rec-intent-meta">
            <Eyebrow>The finding · 03 / 03 · RECOMMEND</Eyebrow>
            {fromCache ? <span className="rec-cache-badge mono muted">cached · instant</span> : null}
        </div>
        <p className="rec-intent">
            <span className="rec-intent-stack">
                <span className={"rec-intent-line " + (phase >= 1 ? "is-out" : "")}>
                    {words.map((w, i) => (
                        <span
                            key={i}
                            className={"rec-word " + (phase >= 1 ? "dissolving" : "")}
                            style={{ transitionDelay: phase === 1 ? `${i * 35}ms` : "0ms" }}
                        >
                            {w}
                        </span>
                    ))}
                </span>
                <span className={"rec-intent-line rec-intent-line--after " + (phase >= 2 ? "is-in" : "")}>
                    <span className="serif" style={{ color: "var(--gray)" }}>
                        {transformVerb}
                    </span>{" "}
                    <span className="serif blue" style={{ fontStyle: "italic" }}>
                        {transformChart}
                    </span>
                </span>
            </span>
        </p>
    </div>
);
