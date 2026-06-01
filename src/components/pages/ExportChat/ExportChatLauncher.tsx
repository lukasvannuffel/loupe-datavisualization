"use client";

import { useEffect, useState } from "react";

const NUDGE_KEY = "loupe.chatOpened";

type ExportChatLauncherProps = {
    open: boolean;
    onOpen: () => void;
};

export const ExportChatLauncher = ({
    open,
    onOpen,
}: ExportChatLauncherProps): JSX.Element | null => {
    const [showNudge, setShowNudge] = useState<boolean>(false);

    useEffect(() => {
        const opened = sessionStorage.getItem(NUDGE_KEY);

        if (!opened) {
            setShowNudge(true);
        }
    }, []);

    if (open) {
        return null;
    }

    const onClick = (): void => {
        sessionStorage.setItem(NUDGE_KEY, "1");
        setShowNudge(false);
        onOpen();
    };

    const onDismissNudge = (e: React.MouseEvent): void => {
        e.stopPropagation();
        sessionStorage.setItem(NUDGE_KEY, "1");
        setShowNudge(false);
    };

    return (
        <div className="chat-launcher-wrap">
            {showNudge && (
                <div className="chat-nudge" role="status">
                    <span className="chat-nudge-body">
                        Want to know more about this chart? <strong>Chat with Loupe</strong> to ask questions.
                    </span>
                    <button
                        type="button"
                        className="chat-nudge-close"
                        onClick={onDismissNudge}
                        aria-label="Dismiss"
                    >
                        ×
                    </button>
                </div>
            )}

            <button
                type="button"
                className={"chat-launcher" + (showNudge ? " is-nudging" : "")}
                onClick={onClick}
                aria-label="Chat with Loupe"
            >
                <span className="chat-launcher-icon" aria-hidden="true">
                    <span className="chat-launcher-dot" />
                </span>
                <span className="chat-launcher-label">Chat with Loupe</span>
            </button>
        </div>
    );
};
