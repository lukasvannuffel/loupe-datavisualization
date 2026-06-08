import { RingLoader } from "@/components/primitives/RingLoader";

type ExportFigureActionsProps = {
    readonly copied: boolean;
    readonly copying: boolean;
    readonly exporting: boolean;
    readonly onCopy: () => void;
    readonly onDownloadSvg: () => void;
    readonly onPngExport: (dpi: 300 | 600) => void;
    readonly pngLoading: false | 300 | 600;
};

export const ExportFigureActions = ({
    copied,
    copying,
    exporting,
    onCopy,
    onDownloadSvg,
    onPngExport,
    pngLoading,
}: ExportFigureActionsProps): JSX.Element => {
    const exportsBusy = exporting || pngLoading !== false;

    return (
        <section className="export-panel-zone" aria-labelledby="export-figure-heading">
            <h3 id="export-figure-heading" className="export-panel-label">
                Export figure
            </h3>
            <button
                type="button"
                className="btn btn--primary btn--lg export-panel-primary"
                disabled={exportsBusy}
                onClick={onDownloadSvg}
            >
                {exporting ? "Exporting…" : "Download SVG"}
                {!exporting ? <span className="export-badge">Recommended</span> : null}
            </button>
            <div className="export-format-row">
                <div className="export-png-row">
                    <span className="export-png-label">Download PNG</span>
                    <span className="export-dpi" role="group" aria-label="PNG resolution">
                        {([300, 600] as const).map((dpi) => (
                            <button
                                key={dpi}
                                type="button"
                                className={pngLoading === dpi ? "active" : ""}
                                disabled={exportsBusy || copying}
                                onClick={() => {
                                    onPngExport(dpi);
                                }}
                            >
                                {pngLoading === dpi ? (
                                    <>
                                        <RingLoader /> Exporting…
                                    </>
                                ) : (
                                    `${dpi} dpi`
                                )}
                            </button>
                        ))}
                    </span>
                </div>
                <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    disabled={copying || exportsBusy}
                    onClick={onCopy}
                >
                    {copying ? "Copying…" : copied ? "Copied ✓" : "Copy to clipboard"}
                </button>
            </div>
        </section>
    );
};
