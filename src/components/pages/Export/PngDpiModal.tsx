import { Dialog } from "@/components/ui/Dialog";
import { RingLoader } from "@/components/primitives/RingLoader";

export type PngDpiModalProps = {
    readonly open: boolean;
    readonly loading: false | 300 | 600;
    readonly onSelect: (dpi: 300 | 600) => void;
    readonly onClose: () => void;
};

const OPTIONS: ReadonlyArray<readonly [300 | 600, string, string]> = [
    [300, "Standard (300 dpi)", "manuscripts, figures"],
    [600, "High resolution (600 dpi)", "print, posters"],
] as const;

export const PngDpiModal = ({
    open,
    loading,
    onSelect,
    onClose,
}: PngDpiModalProps): JSX.Element => {
    const handleClose = (): void => {
        if (loading !== false) {
            return;
        }
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} title="Export as PNG" variant="compact">
            <h3 className="dialog-compact-title">Export as PNG</h3>
            <p className="dialog-compact-hint">Choose the resolution for your export.</p>
            <div className="png-dpi-options">
                {OPTIONS.map(([dpi, label, sub]) => (
                    <button
                        key={dpi}
                        type="button"
                        className="btn btn--secondary btn--sm png-dpi-option"
                        disabled={loading !== false}
                        onClick={() => {
                            onSelect(dpi);
                        }}
                    >
                        {loading === dpi ? (
                            <>
                                <RingLoader /> Exporting…
                            </>
                        ) : (
                            <>
                                {label}
                                <span className="png-dpi-option-sub">{sub}</span>
                            </>
                        )}
                    </button>
                ))}
            </div>
            <div className="dialog-compact-actions">
                <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    disabled={loading !== false}
                    onClick={handleClose}
                >
                    Cancel
                </button>
            </div>
        </Dialog>
    );
};
