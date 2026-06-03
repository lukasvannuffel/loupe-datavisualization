"use client";

import { useEffect, useRef, type RefObject } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function useScrollReveal<T extends HTMLElement>(): RefObject<T | null> {
    const ref = useRef<T>(null);

    useEffect(() => {
        const element = ref.current;
        if (element === null) {
            return;
        }

        // matchMedia read once at mount — live OS toggle not handled.
        // Acceptable for Landing; revisit if hook is reused on dynamic routes.
        if (window.matchMedia(REDUCED_MOTION_QUERY).matches) {
            element.setAttribute("data-revealed", "true");
            return;
        }

        const observer = new IntersectionObserver(([entry]) => {
            if (entry === undefined) {
                return;
            }

            if (entry.isIntersecting) {
                element.setAttribute("data-revealed", "true");
            } else {
                element.removeAttribute("data-revealed");
            }
        }, { threshold: [0, 0.15] });

        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    return ref;
}
