import Link from "next/link";

type ViewOnlyNoticeProps = {
    readonly chartName: string;
    readonly thumbnail: string | null;
};

export const ViewOnlyNotice = ({ chartName, thumbnail }: ViewOnlyNoticeProps): JSX.Element => {
    return (
        <section className="export-receipt" role="status">
            <h4>{chartName}</h4>
            {thumbnail !== null ? (
                <img
                    src={thumbnail}
                    alt=""
                    width={240}
                    height={160}
                    style={{ display: "block", borderRadius: 12, marginBottom: 12 }}
                />
            ) : null}
            <p>
                This chart was saved as a snapshot to protect patient data. Re-upload the source CSV
                to edit.
            </p>
            <Link href="/upload" className="btn btn--primary btn--sm">
                Re-upload source data
            </Link>
        </section>
    );
};
