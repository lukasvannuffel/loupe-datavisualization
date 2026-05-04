"use client";

import { useEffect, useState } from "react";

const HERO_INTENTS: readonly string[] = [
    "Compare survival between two cohorts over 5 years.",
    "Show distribution of tumor sizes by stage.",
    "Plot hazard ratios across pre-specified subgroups.",
];

const CURVE_A = "M40 60 H90 V72 H140 V88 H190 V100 H240 V108 H290 V120 H340 V128 H400 V134 H460";
const CURVE_B = "M40 60 H80 V80 H120 V100 H160 V120 H200 V140 H240 V158 H280 V172 H320 V184 H360 V190 H460";

const CENSOR_TICKS: readonly [number, number][] = [
    [90, 72],
    [190, 100],
    [290, 120],
    [400, 134],
];

const Y_TICKS: readonly number[] = [0, 0.25, 0.5, 0.75, 1];
const X_TICKS: readonly number[] = [0, 12, 24, 36, 48, 60];

export const HeroMotion = (): JSX.Element => {
    const [phase, setPhase] = useState<number>(0);
    const [intentIdx, setIntentIdx] = useState<number>(0);
    const [typed, setTyped] = useState<string>("");

    useEffect(() => {
        const timers: ReturnType<typeof setTimeout>[] = [];
        const intent = HERO_INTENTS[intentIdx];
        setTyped("");
        setPhase(0);

        let i = 0;
        const typeStep = (): void => {
            i++;
            setTyped(intent.slice(0, i));
            if (i < intent.length) {
                timers.push(setTimeout(typeStep, 32));

                return;
            }

            timers.push(setTimeout(() => setPhase(1), 900));
            timers.push(setTimeout(() => setPhase(2), 1500));
            timers.push(setTimeout(() => setPhase(3), 3000));
            timers.push(
                setTimeout(() => setIntentIdx((idx) => (idx + 1) % HERO_INTENTS.length), 5400),
            );
        };

        timers.push(setTimeout(typeStep, 240));

        return () => {
            timers.forEach(clearTimeout);
        };
    }, [intentIdx]);

    return (
        <div className="hero-motion">
            <div className="hero-motion-frame" style={{ opacity: 1 }}>
                <div
                    className={
                        "hero-intent " +
                        (phase === 0 ? "is-typing" : phase >= 1 ? "is-dissolving" : "is-gone")
                    }
                >
                    <span className="hero-intent-prompt">›</span>
                    <span className="hero-intent-text">{typed}</span>
                    {phase === 0 && <span className="hero-caret" />}
                </div>

                <svg viewBox="0 0 500 240" className={"hero-svg phase-" + phase} preserveAspectRatio="xMidYMid meet">
                    <line x1="40" y1="200" x2="460" y2="200" stroke="var(--ink)" strokeWidth="0.75" />
                    <line x1="40" y1="40" x2="40" y2="200" stroke="var(--ink)" strokeWidth="0.75" />

                    {Y_TICKS.map((v, i) => {
                        const y = 200 - v * 160;

                        return (
                            <g key={i} className="hero-axis-el">
                                <line x1="36" x2="40" y1={y} y2={y} stroke="var(--ink)" strokeWidth="0.6" />
                                <text
                                    x="32"
                                    y={y + 3}
                                    textAnchor="end"
                                    fontSize="9"
                                    fontFamily="Inter"
                                    fill="var(--gray)"
                                >
                                    {v.toFixed(2)}
                                </text>
                            </g>
                        );
                    })}

                    {X_TICKS.map((v, i) => {
                        const x = 40 + (v / 60) * 420;

                        return (
                            <g key={i} className="hero-axis-el">
                                <line x1={x} x2={x} y1="200" y2="204" stroke="var(--ink)" strokeWidth="0.6" />
                                <text
                                    x={x}
                                    y="216"
                                    textAnchor="middle"
                                    fontSize="9"
                                    fontFamily="Inter"
                                    fill="var(--gray)"
                                >
                                    {v}
                                </text>
                            </g>
                        );
                    })}

                    <g className="hero-curves">
                        <path
                            d={CURVE_A}
                            fill="none"
                            stroke="var(--ink)"
                            strokeWidth="1.4"
                            pathLength="100"
                            style={{
                                strokeDasharray: 100,
                                strokeDashoffset: phase >= 2 ? 0 : 100,
                                transition: "stroke-dashoffset 1100ms cubic-bezier(0.22,0.61,0.36,1) 100ms",
                            }}
                        />
                        <path
                            d={CURVE_B}
                            fill="none"
                            stroke="var(--gray)"
                            strokeWidth="1.4"
                            strokeDasharray="3 2"
                            pathLength="100"
                            style={{
                                transition: "opacity 600ms ease 600ms",
                                opacity: phase >= 2 ? 1 : 0,
                            }}
                        />
                        {CENSOR_TICKS.map(([x, y], i) => (
                            <line
                                key={i}
                                x1={x}
                                y1={y - 4}
                                x2={x}
                                y2={y + 4}
                                stroke="var(--ink)"
                                strokeWidth="0.75"
                                style={{
                                    opacity: phase >= 3 ? 0.85 : 0,
                                    transition: `opacity 240ms ease ${800 + i * 80}ms`,
                                }}
                            />
                        ))}
                    </g>

                    <g
                        className="hero-legend"
                        style={{ opacity: phase >= 3 ? 1 : 0, transition: "opacity 320ms ease 1100ms" }}
                    >
                        <line x1="320" y1="58" x2="338" y2="58" stroke="var(--ink)" strokeWidth="1.4" />
                        <text x="344" y="61" fontSize="10" fontFamily="Inter" fill="var(--ink)">
                            Treatment (n=312)
                        </text>
                        <line
                            x1="320"
                            y1="76"
                            x2="338"
                            y2="76"
                            stroke="var(--gray)"
                            strokeWidth="1.4"
                            strokeDasharray="3 2"
                        />
                        <text x="344" y="79" fontSize="10" fontFamily="Inter" fill="var(--ink)">
                            Control (n=298)
                        </text>
                    </g>

                    <text
                        x="250"
                        y="234"
                        textAnchor="middle"
                        fontSize="9.5"
                        fontFamily="Inter"
                        fill="var(--gray)"
                        letterSpacing="0.06em"
                        style={{ opacity: phase >= 3 ? 1 : 0, transition: "opacity 300ms ease 900ms" }}
                    >
                        MONTHS SINCE RANDOMIZATION
                    </text>
                    <text
                        x="14"
                        y="120"
                        textAnchor="middle"
                        fontSize="9.5"
                        fontFamily="Inter"
                        fill="var(--gray)"
                        letterSpacing="0.06em"
                        transform="rotate(-90 14 120)"
                        style={{ opacity: phase >= 3 ? 1 : 0, transition: "opacity 300ms ease 900ms" }}
                    >
                        SURVIVAL PROBABILITY
                    </text>

                    <g
                        style={{
                            opacity: phase === 1 || phase === 2 ? 0.9 : 0,
                            transition: "opacity 360ms ease",
                        }}
                    >
                        <circle
                            cx={phase >= 2 ? 180 : 250}
                            cy={phase >= 2 ? 100 : 120}
                            r="36"
                            fill="none"
                            stroke="var(--amber)"
                            strokeWidth="0.8"
                            style={{ transition: "all 800ms cubic-bezier(0.22,0.61,0.36,1)" }}
                        />
                    </g>

                    <g style={{ opacity: phase >= 3 ? 1 : 0, transition: "opacity 400ms ease 1300ms" }}>
                        <rect
                            x="48"
                            y="48"
                            width="148"
                            height="44"
                            fill="var(--paper)"
                            stroke="var(--hairline-strong)"
                            strokeWidth="0.5"
                            rx="2"
                        />
                        <text
                            x="56"
                            y="62"
                            fontSize="9"
                            fontFamily="Inter"
                            fill="var(--gray)"
                            letterSpacing="0.14em"
                        >
                            RECOMMENDED
                        </text>
                        <text
                            x="56"
                            y="80"
                            fontSize="13"
                            fontFamily="Source Serif 4, Georgia, serif"
                            fill="var(--ink)"
                        >
                            Kaplan–Meier curve
                        </text>
                    </g>
                </svg>

                <div className="hero-phase-indicator">
                    <span className={phase === 0 ? "active" : ""}>finding</span>
                    <span className="sep" />
                    <span className={phase === 1 ? "active" : ""}>analysis</span>
                    <span className="sep" />
                    <span className={phase >= 2 ? "active" : ""}>chart</span>
                </div>
            </div>
        </div>
    );
};
