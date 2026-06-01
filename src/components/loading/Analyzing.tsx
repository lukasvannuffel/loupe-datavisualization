"use client";

import { useEffect, useRef, useState } from "react";

import { Eyebrow } from "@/components/primitives/Eyebrow";

import { HINTS, initAnalyzingScene, readAnalyzingColours } from "./Analyzing.draw";
import styles from "./Analyzing.module.css";

export default function Analyzing(): JSX.Element {
    const wrapRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hintIndex, setHintIndex] = useState(0);

    useEffect(() => {
        const id = setInterval(() => {
            setHintIndex((i) => (i + 1) % HINTS.length);
        }, 3000);

        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        const wrap = wrapRef.current;
        if (canvas === null || wrap === null) {
            return;
        }

        const colours = readAnalyzingColours();
        const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        return initAnalyzingScene({
            canvas,
            colours,
            prefersReduced,
            wrap,
        });
    }, []);

    return (
        <div className={`analyzing-page page-enter ${styles.page}`}>
            <div className={`container ${styles.shell}`}>
                <div className="analyzing-top">
                    <Eyebrow>Analyzing · reading structure</Eyebrow>
                </div>

                <div className="analyzing-field" ref={wrapRef}>
                    <canvas ref={canvasRef} className="analyzing-canvas" aria-hidden="true" />
                    <p className="analyzing-hint" aria-live="polite">
                        {HINTS[hintIndex]}
                    </p>
                </div>
            </div>
        </div>
    );
}
