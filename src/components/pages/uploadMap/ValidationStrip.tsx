import type { ValidationResult } from "@/lib/roles";

type ValidationStripProps = {
    readonly validation: ValidationResult;
};

export const ValidationStrip = ({ validation }: ValidationStripProps): JSX.Element => {
    const tone = validation.status === "valid" ? "is-ok" : "is-warn";
    const icon = validation.status === "valid" ? "✓" : "!";

    return (
        <div className={`validation-strip ${tone}`} role="status" aria-live="polite">
            <span className="validation-icon" aria-hidden="true">{icon}</span>
            <span className="validation-text mono">{validation.message}</span>
        </div>
    );
};
