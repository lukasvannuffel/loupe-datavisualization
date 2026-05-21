"use client";

import { useEffect, useRef, useState } from "react";

import type { Dimensions } from "./chart.types";

export const useResizeObserver = <T extends HTMLElement>(): readonly [
    React.RefObject<T | null>,
    Dimensions | null,
] => {
    const ref = useRef<T>(null);
    const [size, setSize] = useState<Dimensions | null>(null);

    useEffect(() => {
        const element = ref.current;
        if (!element) {
            return;
        }

        let rafId: number | null = null;
        const observer = new ResizeObserver((entries) => {
            if (rafId !== null) {
                cancelAnimationFrame(rafId);
            }
            rafId = requestAnimationFrame(() => {
                const entry = entries[0];
                if (!entry) {
                    return;
                }
                const { width, height } = entry.contentRect;
                setSize({ width: Math.round(width), height: Math.round(height) });
            });
        });

        observer.observe(element);

        const rect = element.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
            setSize({
                width: Math.round(rect.width),
                height: Math.round(rect.height),
            });
        }

        return () => {
            observer.disconnect();
            if (rafId !== null) {
                cancelAnimationFrame(rafId);
            }
        };
    }, []);

    return [ref, size] as const;
};
