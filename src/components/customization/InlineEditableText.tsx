"use client";

import { useEffect, useRef, useState } from "react";

import type { LabelAnchor } from "@/components/charts/d3/chartLabelLayout";

type InlineEditableTextProps = {
    readonly value: string;
    readonly onChange: (next: string) => void;
    readonly x: number;
    readonly y: number;
    readonly foreignX: number;
    readonly foreignY: number;
    readonly width: number;
    readonly height: number;
    readonly textAnchor?: LabelAnchor;
    readonly rotate?: number;
    readonly dataRole: string;
    readonly fontFamily?: string;
    readonly fontSize?: number;
};

export const InlineEditableText = ({
    value,
    onChange,
    x,
    y,
    foreignX,
    foreignY,
    width,
    height,
    textAnchor = "middle",
    rotate,
    dataRole,
    fontFamily = "var(--font-mono, ui-monospace)",
    fontSize = 11,
}: InlineEditableTextProps): JSX.Element | null => {
    const [mode, setMode] = useState<"display" | "editing">("display");
    const [draft, setDraft] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (mode !== "editing") {
            return;
        }

        const input = inputRef.current;
        if (input === null) {
            return;
        }

        input.focus();
        input.select();
    }, [mode]);

    const startEditing = (): void => {
        setDraft(value);
        setMode("editing");
    };

    const commit = (): void => {
        onChange(draft);
        setMode("display");
    };

    const cancel = (): void => {
        setDraft(value);
        setMode("display");
    };

    if (value.length === 0 && mode === "display") {
        return null;
    }

    if (mode === "editing") {
        return (
            <foreignObject
                x={foreignX}
                y={foreignY}
                width={width}
                height={height}
                data-role={`${dataRole}-editor`}
            >
                <input
                    ref={inputRef}
                    type="text"
                    className="chart-inline-input"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onBlur={commit}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            event.preventDefault();
                            commit();
                        }

                        if (event.key === "Escape") {
                            event.preventDefault();
                            cancel();
                        }
                    }}
                />
            </foreignObject>
        );
    }

    return (
        <text
            data-role={dataRole}
            x={x}
            y={y}
            textAnchor={textAnchor}
            fill="var(--ink)"
            style={{
                cursor: "text",
                fontFamily,
                fontSize: `${fontSize}px`,
            }}
            transform={rotate !== undefined ? `rotate(${rotate} ${x} ${y})` : undefined}
            onClick={startEditing}
            onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    startEditing();
                }
            }}
            role="button"
            tabIndex={0}
        >
            {value}
        </text>
    );
};
