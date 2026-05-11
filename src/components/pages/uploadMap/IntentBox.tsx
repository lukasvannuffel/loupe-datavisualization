import { useEffect, useState } from "react";

const PLACEHOLDERS: readonly string[] = [
    "Compare 5-year survival between treatment arms…",
    "Show distribution of tumor sizes by stage…",
    "Plot hazard ratios across pre-specified subgroups…",
    "Compare biomarker concordance between two assays…",
];

type IntentBoxProps = {
    readonly intent: string;
    readonly onChange: (next: string) => void;
};

export const IntentBox = ({ intent, onChange }: IntentBoxProps): JSX.Element => {
    const [phIndex, setPhIndex] = useState<number>(0);

    useEffect(() => {
        const t = setInterval(() => setPhIndex((i) => (i + 1) % PLACEHOLDERS.length), 3500);

        return () => clearInterval(t);
    }, []);

    return (
        <div className="intent-block">
            <div className="intent-input-wrap">
                <textarea
                    className="textarea"
                    aria-label="What did you find?"
                    value={intent}
                    onChange={(e) => onChange(e.target.value)}
                    rows={3}
                />
                {intent.length === 0 && (
                    <div className="intent-rotator" key={phIndex}>
                        {PLACEHOLDERS[phIndex]}
                    </div>
                )}
            </div>
            <span className="muted intent-meta-note">
                Plain language. No statistics jargon required.
            </span>
        </div>
    );
};
