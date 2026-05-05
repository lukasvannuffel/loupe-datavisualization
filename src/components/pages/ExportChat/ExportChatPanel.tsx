"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import { findExchange, SUGGESTION_CHIPS } from "./scriptedExchanges";
import type {
    ChartConfig,
    ChatMessage,
    RailSection,
    ScriptedExchange,
} from "./types";

type ExportChatPanelProps = {
    open: boolean;
    onClose: () => void;
    applyPatch: (patch: Partial<ChartConfig>) => void;
    appendRevision: (entry: string) => void;
    openRailSection: (section: RailSection) => void;
};

const RESPONSE_DELAY_MS = 320;

const makeId = (): string => Math.random().toString(36).slice(2, 10);

const INTRO_COPY = "Ask Loupe for things the rail can't express — re-fits, annotations, explanations, presets.";

export const ExportChatPanel = ({
    open,
    onClose,
    applyPatch,
    appendRevision,
    openRailSection,
}: ExportChatPanelProps): JSX.Element | null => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState<string>("");
    const [pending, setPending] = useState<boolean>(false);

    const logRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!open) {
            return;
        }

        const onKey = (e: KeyboardEvent): void => {
            if (e.key === "Escape") {
                onClose();
            }
        };

        window.addEventListener("keydown", onKey);

        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [messages, pending]);

    const submitExchange = (exchange: ScriptedExchange, userText: string): void => {
        const userMsg: ChatMessage = {
            id: makeId(),
            role: "user",
            text: userText,
            ts: Date.now(),
        };

        setMessages((prev) => [...prev, userMsg]);
        setPending(true);

        window.setTimeout(() => {
            const aiMsg: ChatMessage = {
                id: makeId(),
                role: "ai",
                text: exchange.response,
                ts: Date.now(),
                railHint: exchange.railHint,
            };

            setMessages((prev) => [...prev, aiMsg]);
            setPending(false);

            if (exchange.patch) {
                applyPatch(exchange.patch);
            }

            if (exchange.receiptEntry) {
                appendRevision(exchange.receiptEntry);
            }
        }, RESPONSE_DELAY_MS);
    };

    const onSubmit = (e: FormEvent<HTMLFormElement>): void => {
        e.preventDefault();

        const trimmed = input.trim();

        if (trimmed.length === 0 || pending) {
            return;
        }

        const exchange = findExchange(trimmed);

        setInput("");
        submitExchange(exchange, trimmed);
    };

    const onChip = (exchange: ScriptedExchange): void => {
        if (pending) {
            return;
        }

        submitExchange(exchange, exchange.userEcho);
    };

    const onRailHintClick = (section: RailSection): void => {
        openRailSection(section);
    };

    if (!open) {
        return null;
    }

    return (
        <>
            <div
                className="chat-scrim"
                onClick={onClose}
                aria-hidden="true"
            />
            <aside
                className="chat-panel"
                role="dialog"
                aria-label="Refine with Loupe"
            >
                <header className="chat-panel-head">
                    <div>
                        <div className="chat-panel-title">Refine with Loupe</div>
                        <div className="chat-panel-sub">
                            For palette, legend, axes — use the rail.
                        </div>
                    </div>
                    <button
                        type="button"
                        className="btn btn--quiet btn--sm"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        Close
                    </button>
                </header>

                <div className="chat-log" ref={logRef}>
                    {messages.length === 0 && (
                        <div className="chat-empty">
                            <p>{INTRO_COPY}</p>
                            <div className="chat-chips">
                                {SUGGESTION_CHIPS.map((chip) => (
                                    <button
                                        key={chip.id}
                                        type="button"
                                        className="btn btn--ghost btn--sm chat-chip"
                                        onClick={() => onChip(chip)}
                                    >
                                        {chip.userEcho}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {messages.map((m) => (
                        <div
                            key={m.id}
                            className={"chat-msg " + (m.role === "user" ? "is-user" : "is-ai")}
                        >
                            <div className="chat-msg-body">{m.text}</div>
                            {m.role === "ai" && m.railHint && (
                                <button
                                    type="button"
                                    className="chat-rail-hint"
                                    onClick={() => onRailHintClick(m.railHint!.section)}
                                >
                                    {m.railHint.copy} →
                                </button>
                            )}
                        </div>
                    ))}

                    {pending && (
                        <div className="chat-msg is-ai is-pending">
                            <span className="chat-typing" aria-hidden="true">
                                <span /><span /><span />
                            </span>
                        </div>
                    )}
                </div>

                <form className="chat-input-wrap" onSubmit={onSubmit}>
                    <textarea
                        className="chat-input"
                        rows={2}
                        placeholder="Ask for a re-fit, annotation, or preset…"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                e.currentTarget.form?.requestSubmit();
                            }
                        }}
                        disabled={pending}
                    />
                    <button
                        type="submit"
                        className="btn btn--primary btn--sm"
                        disabled={pending || input.trim().length === 0}
                    >
                        Send
                    </button>
                </form>

                <div className="chat-panel-foot">
                    Prototype — scripted responses. No model is being called.
                </div>
            </aside>
        </>
    );
};
