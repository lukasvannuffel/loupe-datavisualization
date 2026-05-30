"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { RingLoader } from "@/components/primitives/RingLoader";

import styles from "./chartFrameLoader.module.css";

type ChartFrameLoaderProps = {
    readonly children: ReactNode;
};

export const ChartFrameLoader = ({ children }: ChartFrameLoaderProps): JSX.Element => {
    const frameRef = useRef<HTMLDivElement | null>(null);
    const [ready, setReady] = useState<boolean>(false);

    useEffect(() => {
        const frame = frameRef.current;

        if (frame === null) {
            return;
        }

        const syncReady = (): void => {
            setReady(frame.querySelector("svg") !== null);
        };

        syncReady();

        const observer = new MutationObserver(syncReady);
        observer.observe(frame, { childList: true, subtree: true });

        return () => {
            observer.disconnect();
        };
    }, [children]);

    return (
        <div className={styles.wrap} ref={frameRef}>
            {!ready ? (
                <div className={styles.loader} aria-busy="true" aria-label="Rendering chart">
                    <RingLoader />
                </div>
            ) : null}
            {children}
        </div>
    );
};
