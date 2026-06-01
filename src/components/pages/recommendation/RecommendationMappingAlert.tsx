import Link from "next/link";

export const RecommendationMappingAlert = (): JSX.Element => (
    <div className="rec-chart-empty muted" role="alert">
        <p>
            Column mapping incomplete —{" "}
            <Link href="/upload/map">return to column mapping</Link>
        </p>
    </div>
);
