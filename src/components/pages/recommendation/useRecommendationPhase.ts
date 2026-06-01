import { useEffect, useState } from "react";

export const useRecommendationPhase = (): number => {
    const [phase, setPhase] = useState<number>(0);

    useEffect(() => {
        let cancelled = false;
        const arm = (ms: number, n: number) =>
            window.setTimeout(() => {
                if (!cancelled) {
                    setPhase(n);
                }
            }, ms);
        const t1 = arm(200, 1);
        const t2 = arm(700, 2);
        const t3 = arm(1100, 3);
        return () => {
            cancelled = true;
            [t1, t2, t3].forEach((t) => window.clearTimeout(t));
        };
    }, []);

    return phase;
};
