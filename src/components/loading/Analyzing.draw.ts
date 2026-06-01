export const HINTS = [
    "Reading column structure\u2026",
    "Matching chart patterns\u2026",
    "Almost there\u2026",
] as const;

export type AnalyzingColours = {
    readonly ink: string;
    readonly amber: string;
    readonly paper: string;
    readonly paperCard: string;
    readonly hairline: string;
};

const FLOURISH_AFTER_MS = 9000;
const FLOURISH_DURATION_MS = 950;
const SCAN_FINISH_BOOST = 0.22;

export const readAnalyzingColours = (): AnalyzingColours => {
    const style = getComputedStyle(document.documentElement);
    const get = (name: string): string => style.getPropertyValue(name).trim();

    return {
        ink: get("--ink"),
        amber: get("--amber"),
        paper: get("--paper"),
        paperCard: get("--paper-card"),
        hairline: get("--hairline"),
    };
};

const withAlpha = (color: string, alpha: number): string => {
    const hex = color.replace("#", "");
    if (hex.length === 6) {
        const r = Number.parseInt(hex.slice(0, 2), 16);
        const g = Number.parseInt(hex.slice(2, 4), 16);
        const b = Number.parseInt(hex.slice(4, 6), 16);

        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    if (color.startsWith("rgb")) {
        const inner = color.replace(/rgba?\(|\)|\s/g, "");
        const [r, g, b] = inner.split(",").map((v) => Number.parseFloat(v));

        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    return color;
};

const mulberry32 = (seed: number): (() => number) => {
    let a = seed;

    return (): number => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

type PlotBounds = {
    readonly px0: number;
    readonly px1: number;
    readonly py0: number;
    readonly py1: number;
};

type Offscreen = {
    readonly c: HTMLCanvasElement;
    readonly cx: CanvasRenderingContext2D;
};

export type InitAnalyzingSceneArgs = {
    readonly canvas: HTMLCanvasElement;
    readonly wrap: HTMLDivElement;
    readonly colours: AnalyzingColours;
    readonly prefersReduced: boolean;
};

export const initAnalyzingScene = ({
    canvas,
    wrap,
    colours,
    prefersReduced,
}: InitAnalyzingSceneArgs): (() => void) => {
    const ctx = canvas.getContext("2d");
    if (ctx === null) {
        return () => undefined;
    }

    let raf = 0;
    let W = 0;
    let H = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let noise: Offscreen | null = null;
    let signal: Offscreen | null = null;
    let mask: Offscreen | null = null;
    let scratch: Offscreen | null = null;
    let plot: PlotBounds | null = null;

    const lens = { x: 0, y: 0, tx: 0, ty: 0, r: 86 };
    let lastMove = -9999;
    const start = performance.now();
    let scanBoost = 0;
    let doneStart = 0;
    let finished = false;

    const makeCanvas = (w: number, h: number): Offscreen => {
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(w * dpr));
        c.height = Math.max(1, Math.round(h * dpr));
        const cx = c.getContext("2d");
        if (cx === null) {
            throw new Error("2d context unavailable");
        }
        cx.setTransform(dpr, 0, 0, dpr, 0, 0);

        return { c, cx };
    };

    const buildSignal = (g: CanvasRenderingContext2D): void => {
        const l = 0.11;
        const r = 0.11;
        const t = 0.2;
        const b = 0.22;
        const px0 = W * l;
        const px1 = W * (1 - r);
        const py0 = H * t;
        const py1 = H * (1 - b);
        plot = { px0, px1, py0, py1 };
        const X = (u: number): number => px0 + (px1 - px0) * u;
        const Y = (s: number): number => py1 - (py1 - py0) * s;

        g.strokeStyle = colours.ink;
        g.lineWidth = 1;
        g.globalAlpha = 0.85;
        g.beginPath();
        g.moveTo(px0, py0);
        g.lineTo(px0, py1);
        g.lineTo(px1, py1);
        g.stroke();
        g.globalAlpha = 0.5;
        g.lineWidth = 0.8;
        [0, 0.25, 0.5, 0.75, 1].forEach((s) => {
            const y = Y(s);
            g.beginPath();
            g.moveTo(px0 - 5, y);
            g.lineTo(px0, y);
            g.stroke();
        });
        g.globalAlpha = 1;

        const armA: ReadonlyArray<readonly [number, number]> = [
            [0, 1],
            [0.08, 0.96],
            [0.2, 0.9],
            [0.34, 0.85],
            [0.5, 0.79],
            [0.66, 0.73],
            [0.82, 0.67],
            [1, 0.61],
        ];
        const armB: ReadonlyArray<readonly [number, number]> = [
            [0, 1],
            [0.06, 0.93],
            [0.16, 0.84],
            [0.3, 0.72],
            [0.46, 0.61],
            [0.62, 0.51],
            [0.8, 0.43],
            [1, 0.34],
        ];

        const drawStep = (
            pts: ReadonlyArray<readonly [number, number]>,
            color: string,
            dash: ReadonlyArray<number>,
            w: number,
        ): void => {
            g.strokeStyle = color;
            g.lineWidth = w;
            g.lineJoin = "round";
            g.setLineDash(dash);
            g.beginPath();
            g.moveTo(X(pts[0][0]), Y(pts[0][1]));
            for (let i = 1; i < pts.length; i++) {
                g.lineTo(X(pts[i][0]), Y(pts[i - 1][1]));
                g.lineTo(X(pts[i][0]), Y(pts[i][1]));
            }
            g.stroke();
            g.setLineDash([]);
        };

        drawStep(armB, colours.amber, [5, 3], 2);
        drawStep(armA, colours.ink, [], 2.1);

        const ticksA: ReadonlyArray<readonly [number, number]> = [
            [0.08, 0.96],
            [0.34, 0.85],
            [0.66, 0.73],
            [0.9, 0.63],
        ];
        g.strokeStyle = colours.ink;
        g.lineWidth = 1.1;
        ticksA.forEach(([u, s]) => {
            const x = X(u);
            const y = Y(s);
            g.beginPath();
            g.moveTo(x, y - 5);
            g.lineTo(x, y + 5);
            g.stroke();
        });

        const dot = (u: number, s: number, color: string): void => {
            g.fillStyle = color;
            g.beginPath();
            g.arc(X(u), Y(s), 2.6, 0, Math.PI * 2);
            g.fill();
        };
        armA.forEach(([u, s]) => dot(u, s, colours.ink));
        armB.forEach(([u, s]) => dot(u, s, colours.amber));

        g.font = "500 12px Inter, sans-serif";
        g.textBaseline = "middle";
        const lx = px1 - 168;
        const ly = py0 + 14;
        g.strokeStyle = colours.ink;
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(lx, ly);
        g.lineTo(lx + 20, ly);
        g.stroke();
        g.fillStyle = colours.ink;
        g.textAlign = "left";
        g.fillText("Treatment A", lx + 26, ly);
        g.strokeStyle = colours.amber;
        g.setLineDash([5, 3]);
        g.beginPath();
        g.moveTo(lx, ly + 18);
        g.lineTo(lx + 20, ly + 18);
        g.stroke();
        g.setLineDash([]);
        g.fillStyle = colours.ink;
        g.fillText("Treatment B", lx + 26, ly + 18);
    };

    const buildNoise = (g: CanvasRenderingContext2D): void => {
        const rnd = mulberry32(20260601);
        const N = Math.round((W * H) / 1300);
        for (let i = 0; i < N; i++) {
            const x = rnd() * W;
            const y = rnd() * H;
            const rr = 0.9 + rnd() * 1.7;
            const amberish = rnd() > 0.9;
            g.fillStyle = amberish ? colours.amber : colours.ink;
            g.globalAlpha = amberish ? 0.28 : 0.13 + rnd() * 0.14;
            g.beginPath();
            g.arc(x, y, rr, 0, Math.PI * 2);
            g.fill();
        }
        g.globalAlpha = 1;
    };

    const rebuild = (): void => {
        const rect = wrap.getBoundingClientRect();
        W = Math.max(320, Math.round(rect.width));
        H = Math.max(320, Math.round(rect.height));
        lens.r = Math.max(64, Math.min(96, W * 0.085));
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        canvas.style.width = `${W}px`;
        canvas.style.height = `${H}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        noise = makeCanvas(W, H);
        buildNoise(noise.cx);
        signal = makeCanvas(W, H);
        buildSignal(signal.cx);
        mask = makeCanvas(W, H);
        scratch = makeCanvas(W, H);

        if (lens.x === 0 && lens.y === 0) {
            lens.x = W * 0.5;
            lens.tx = W * 0.5;
            lens.y = H * 0.5;
            lens.ty = H * 0.5;
        }
    };

    const stampMask = (x: number, y: number): void => {
        if (mask === null) {
            return;
        }
        const g = mask.cx;
        g.globalCompositeOperation = "lighter";
        const rad = lens.r * 0.92;
        const grd = g.createRadialGradient(x, y, 0, x, y, rad);
        grd.addColorStop(0, withAlpha(colours.paperCard, 0.16));
        grd.addColorStop(0.6, withAlpha(colours.paperCard, 0.08));
        grd.addColorStop(1, withAlpha(colours.paperCard, 0));
        g.fillStyle = grd;
        g.beginPath();
        g.arc(x, y, rad, 0, Math.PI * 2);
        g.fill();
        g.globalCompositeOperation = "source-over";
    };

    const drawLens = (x: number, y: number, ringAlpha: number): void => {
        const r = lens.r;
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillStyle = colours.paperCard;
        ctx.globalAlpha = 0.9;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
        ctx.globalAlpha = 1;
        const k = 1.6;
        if (signal !== null) {
            ctx.translate(x, y);
            ctx.scale(k, k);
            ctx.translate(-x, -y);
            ctx.drawImage(signal.c, 0, 0, W, H);
        }
        ctx.restore();

        ctx.save();
        const vg = ctx.createRadialGradient(x, y, r * 0.55, x, y, r);
        vg.addColorStop(0, withAlpha(colours.ink, 0));
        vg.addColorStop(1, withAlpha(colours.ink, 0.1));
        ctx.fillStyle = vg;
        ctx.globalAlpha = ringAlpha;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = ringAlpha;
        ctx.lineWidth = 2.2;
        ctx.strokeStyle = colours.ink;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.strokeStyle = colours.paperCard;
        ctx.beginPath();
        ctx.arc(x, y, r - 2.4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 2.4;
        ctx.strokeStyle = colours.amber;
        ctx.beginPath();
        ctx.arc(x, y, r, -Math.PI * 0.42, -Math.PI * 0.08);
        ctx.stroke();
        const hx = x + r * Math.cos(Math.PI * 0.25);
        const hy = y + r * Math.sin(Math.PI * 0.25);
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.strokeStyle = colours.ink;
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(hx + r * 0.5, hy + r * 0.5);
        ctx.stroke();
        ctx.lineWidth = 0.8;
        ctx.strokeStyle = withAlpha(colours.ink, 0.3);
        ctx.beginPath();
        ctx.moveTo(x - 7, y);
        ctx.lineTo(x + 7, y);
        ctx.moveTo(x, y - 7);
        ctx.lineTo(x, y + 7);
        ctx.stroke();
        ctx.restore();
    };

    const drawStaticPose = (): void => {
        rebuild();
        if (signal === null || noise === null) {
            return;
        }
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = colours.paperCard;
        ctx.fillRect(0, 0, W, H);
        ctx.drawImage(signal.c, 0, 0, W, H);
        drawLens(W * 0.5, H * 0.5, 1);
    };

    const frame = (now: number): void => {
        if (noise === null || signal === null || mask === null || scratch === null) {
            return;
        }

        const idle = now - lastMove > 1200;
        if (idle && plot !== null) {
            const cx = (plot.px0 + plot.px1) / 2;
            const cy = (plot.py0 + plot.py1) / 2;
            const ax = (plot.px1 - plot.px0) * 0.46;
            const ay = (plot.py1 - plot.py0) * 0.42;
            lens.tx = cx + Math.sin(now * 0.00045) * ax;
            lens.ty = cy + Math.sin(now * 0.00069 + 1.3) * ay;
        }
        const ease = idle ? 0.04 : 0.16;
        lens.x += (lens.tx - lens.x) * ease;
        lens.y += (lens.ty - lens.y) * ease;

        if (
            !finished &&
            (scanBoost >= SCAN_FINISH_BOOST || now - start > FLOURISH_AFTER_MS)
        ) {
            finished = true;
            doneStart = now;
        }

        let fe = 0;
        if (finished) {
            fe = Math.min(1, (now - doneStart) / FLOURISH_DURATION_MS);
        }

        stampMask(lens.x, lens.y);

        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = colours.paperCard;
        ctx.fillRect(0, 0, W, H);

        ctx.globalAlpha = 1 - fe;
        ctx.drawImage(noise.c, 0, 0, W, H);
        ctx.globalAlpha = 1;

        const s = scratch.cx;
        s.setTransform(dpr, 0, 0, dpr, 0, 0);
        s.clearRect(0, 0, W, H);
        s.globalCompositeOperation = "source-over";
        s.drawImage(signal.c, 0, 0, W, H);
        s.globalCompositeOperation = "destination-in";
        s.drawImage(mask.c, 0, 0, W, H);
        s.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 0.95;
        ctx.drawImage(scratch.c, 0, 0, W, H);
        ctx.globalAlpha = 1;

        if (fe > 0) {
            ctx.globalAlpha = fe;
            ctx.drawImage(signal.c, 0, 0, W, H);
            ctx.globalAlpha = 1;
        }

        drawLens(lens.x, lens.y, 1 - fe * 0.85);

        raf = requestAnimationFrame(frame);
    };

    const setTarget = (clientX: number, clientY: number): void => {
        const rect = canvas.getBoundingClientRect();
        lens.tx = clientX - rect.left;
        lens.ty = clientY - rect.top;
        lastMove = performance.now();
        scanBoost = Math.min(SCAN_FINISH_BOOST, scanBoost + 0.0016);
    };

    const onMove = (e: MouseEvent): void => {
        setTarget(e.clientX, e.clientY);
    };

    const onTouch = (e: TouchEvent): void => {
        if (e.touches[0]) {
            setTarget(e.touches[0].clientX, e.touches[0].clientY);
        }
    };

    const onResize = (): void => {
        rebuild();
    };

    rebuild();

    if (prefersReduced) {
        drawStaticPose();

        return () => undefined;
    }

    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("touchmove", onTouch, { passive: true });
    canvas.addEventListener("touchstart", onTouch, { passive: true });
    window.addEventListener("resize", onResize);
    raf = requestAnimationFrame(frame);

    return () => {
        cancelAnimationFrame(raf);
        canvas.removeEventListener("mousemove", onMove);
        canvas.removeEventListener("touchmove", onTouch);
        canvas.removeEventListener("touchstart", onTouch);
        window.removeEventListener("resize", onResize);
    };
};
