import type { RecommendPayload } from "@/lib/ai/recommendChart.types";

type TransparencyPanelProps = {
    readonly payload: RecommendPayload;
};

export const TransparencyPanel = ({ payload }: TransparencyPanelProps): JSX.Element => {
    const json = JSON.stringify(payload, null, 2);

    return (
        <details className="transparency">
            <summary className="transparency-summary">What gets sent · click to view</summary>
            <pre>
                <code>{json}</code>
            </pre>
            <p className="transparency-note">
                No values or rows leave your browser. Only column names, types, and your intent.
            </p>
        </details>
    );
};
