import { useEffect, useRef, useState, type FocusEvent, type MouseEvent } from "react";

import { PngDpiModal } from "@/components/pages/Export/PngDpiModal";

type ExportFigureActionsProps = {
    readonly copied: boolean;
    readonly copying: boolean;
    readonly exporting: boolean;
    readonly onCopy: () => void;
    readonly onDownloadSvg: () => void;
    readonly onPngExport: (dpi: 300 | 600) => void;
    readonly pngLoading: false | 300 | 600;
};

const TOOLTIP_OFFSET = 12;

type TooltipPosition = {
    readonly x: number;
    readonly y: number;
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
    const [modalOpen, setModalOpen] = useState(false);
    const [tooltipOpen, setTooltipOpen] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);
    const wasPngLoading = useRef(false);
    const exportsBusy = exporting || pngLoading !== false;

    useEffect(() => {
        if (pngLoading !== false) {
            wasPngLoading.current = true;
            return;
        }

        if (wasPngLoading.current) {
            if (modalOpen) {
                setModalOpen(false);
            }
            wasPngLoading.current = false;
        }
    }, [pngLoading, modalOpen]);

    const handleModalClose = (): void => {
        if (pngLoading === false) {
            wasPngLoading.current = false;
        }
        setModalOpen(false);
    };

    const showTooltipAt = (x: number, y: number): void => {
        setTooltipOpen(true);
        setTooltipPosition({
            x: x + TOOLTIP_OFFSET,
            y: y + TOOLTIP_OFFSET,
        });
    };

    const hideTooltip = (): void => {
        setTooltipOpen(false);
        setTooltipPosition(null);
    };

    const handleTooltipMouseMove = (event: MouseEvent<HTMLButtonElement>): void => {
        showTooltipAt(event.clientX, event.clientY);
    };

    const handleTooltipFocus = (event: FocusEvent<HTMLButtonElement>): void => {
        const rect = event.currentTarget.getBoundingClientRect();
        showTooltipAt(rect.left, rect.bottom);
    };

    return (
        <div className="export-figure-actions" role="group" aria-label="Export figure">
            <span className="svg-tooltip-host">
                <button
                    type="button"
                    className="btn btn--primary btn--lg"
                    disabled={exportsBusy}
                    aria-describedby="svg-export-tooltip"
                    onMouseEnter={handleTooltipMouseMove}
                    onMouseMove={handleTooltipMouseMove}
                    onMouseLeave={hideTooltip}
                    onFocus={handleTooltipFocus}
                    onBlur={hideTooltip}
                    onClick={onDownloadSvg}
                >
                    {exporting ? "Exporting…" : "Download SVG"}
                    {!exporting ? <span className="export-badge">Recommended</span> : null}
                </button>
                <span
                    id="svg-export-tooltip"
                    className={`svg-tooltip${tooltipOpen ? " svg-tooltip--visible" : ""}`}
                    role="tooltip"
                    style={
                        tooltipPosition === null
                            ? undefined
                            : {
                                left: `${tooltipPosition.x}px`,
                                top: `${tooltipPosition.y}px`,
                            }
                    }
                >
                    Journal publications, web, vector editors
                </span>
            </span>
            <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={exportsBusy || copying}
                onClick={() => {
                    setModalOpen(true);
                }}
            >
                Download PNG
            </button>
            <button
                type="button"
                className="btn btn--quiet btn--sm"
                disabled={copying || exportsBusy}
                onClick={onCopy}
            >
                {copying ? "Copying…" : copied ? "Copied ✓" : "Copy to clipboard"}
            </button>
            <PngDpiModal
                open={modalOpen}
                loading={pngLoading}
                onSelect={onPngExport}
                onClose={handleModalClose}
            />
        </div>
    );
};
