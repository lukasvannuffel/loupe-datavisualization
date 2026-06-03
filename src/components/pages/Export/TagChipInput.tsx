"use client";
import { useState, type KeyboardEvent } from "react";

const MAX_TAGS = 10;
const normaliseTag = (value: string): string => value.trim().toLowerCase();

type TagChipInputProps = {
    readonly tags: readonly string[];
    readonly onChange: (tags: readonly string[]) => void;
    readonly maxTags?: number;
    readonly placeholder?: string;
};

export const TagChipInput = ({
    tags,
    onChange,
    maxTags = MAX_TAGS,
    placeholder = "Add tag…",
}: TagChipInputProps): JSX.Element => {
    const [inputValue, setInputValue] = useState("");
    const addTag = (raw: string): void => {
        const next = normaliseTag(raw);
        if (next.length === 0 || tags.includes(next) || tags.length >= maxTags) return;
        onChange([...tags, next]);
        setInputValue("");
    };

    return (
        <div className="custom-row">
            <label htmlFor="save-chart-tags">Tags</label>
            <div className="chat-chips">
                {tags.map((tag) => (
                    <button key={tag} type="button" className="type-badge" onClick={() => onChange(tags.filter((t) => t !== tag))}>
                        {tag}
                    </button>
                ))}
            </div>
            <input
                id="save-chart-tags"
                className="custom-input"
                value={inputValue}
                placeholder={placeholder}
                onChange={(event) => setInputValue(event.target.value)}
                onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                    if (event.key === "Enter" || event.key === ",") {
                        event.preventDefault();
                        addTag(inputValue);
                        return;
                    }
                    if (event.key === "Backspace" && inputValue.length === 0 && tags.length > 0) {
                        onChange(tags.slice(0, -1));
                    }
                }}
            />
        </div>
    );
};
