"use client";

import type { ErrorBarType } from "@/lib/chartSpec/aggregators/barError.types";

type Props = {
    readonly value: ErrorBarType;
    readonly onChange: (next: ErrorBarType) => void;
};

const OPTIONS: ReadonlyArray<{
    readonly value: ErrorBarType;
    readonly label: string;
    readonly hint: string;
}> = [
    { value: "sd", label: "SD", hint: "Standard deviation — raw spread" },
    { value: "sem", label: "SEM", hint: "Standard error of the mean — precision of the estimate" },
    { value: "ci95", label: "95% CI", hint: "95% confidence interval — most journal-friendly" },
];

export const ErrorTypeToggle = ({ value, onChange }: Props): JSX.Element => (
    <fieldset className="rec-error-toggle" aria-label="Error bar type">
        <legend className="rec-error-toggle__legend mono">Error bars</legend>
        <div className="rec-error-toggle__options">
            {OPTIONS.map((opt) => (
                <label
                    key={opt.value}
                    className={`rec-error-toggle__option ${value === opt.value ? "is-active" : ""}`}
                >
                    <input
                        type="radio"
                        name="error-type"
                        value={opt.value}
                        checked={value === opt.value}
                        onChange={() => onChange(opt.value)}
                    />
                    <span className="mono">{opt.label}</span>
                    <span className="rec-error-toggle__hint muted">{opt.hint}</span>
                </label>
            ))}
        </div>
    </fieldset>
);
