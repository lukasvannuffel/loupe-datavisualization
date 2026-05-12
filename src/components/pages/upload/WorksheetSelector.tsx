"use client";

import type { SheetMeta } from "@/lib/parser/types";

export type WorksheetSelectorProps = {
    ariaLabelledBy: string;
    disabled?: boolean;
    onChange: (sheetName: string) => void;
    sheets: readonly SheetMeta[];
    value: string;
};

const SEGMENTED_MAX = 4;

const sheetLabel = (sheet: SheetMeta): string => {
    return `${sheet.name} · ${sheet.rowCount.toLocaleString()} rows`;
};

export const WorksheetSelector = ({
    ariaLabelledBy,
    disabled = false,
    onChange,
    sheets,
    value,
}: WorksheetSelectorProps): JSX.Element => {
    if (sheets.length <= SEGMENTED_MAX) {
        return (
            <div
                className="sheet-segment-group"
                role="radiogroup"
                aria-labelledby={ariaLabelledBy}
            >
                {sheets.map((sheet) => {
                    const selected = sheet.name === value;

                    return (
                        <button
                            key={sheet.name}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            disabled={disabled}
                            className={"sheet-segment " + (selected ? "is-selected" : "")}
                            onClick={() => {
                                onChange(sheet.name);
                            }}
                        >
                            <span className="sheet-segment-label">{sheetLabel(sheet)}</span>
                        </button>
                    );
                })}
            </div>
        );
    }

    return (
        <div className="sheet-select-wrap">
            <select
                aria-labelledby={ariaLabelledBy}
                className="sheet-select"
                disabled={disabled}
                value={value}
                onChange={(event) => {
                    onChange(event.target.value);
                }}
            >
                {sheets.map((sheet) => (
                    <option key={sheet.name} value={sheet.name}>
                        {sheetLabel(sheet)}
                    </option>
                ))}
            </select>
        </div>
    );
};
