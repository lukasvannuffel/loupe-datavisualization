const LN_SQRT_PI = Math.log(Math.sqrt(Math.PI));

const gammaln = (z: number): number => {
    if (z === 0.5) {
        return LN_SQRT_PI;
    }

    if (z < 12) {
        return gammaln(z + 1) - Math.log(z);
    }

    const lz = Math.log(z);

    return (z - 0.5) * lz - z + 0.5 * Math.log(2 * Math.PI) + 1 / (12 * z);
};

/** Upper-tail p for χ²(df): P(X ≥ x) via regularized incomplete gamma Q(a, x). */
export function chi2pValue(x: number, df: number): number {
    const a = df / 2;
    const z = x / 2;

    if (z <= 0) {
        return 1;
    }

    if (z < a + 1) {
        return 1 - gammaP(a, z);
    }

    return gammaQ(a, z);
}

const gammaP = (a: number, x: number): number => {
    let s = 1 / a;
    let t = s;

    for (let n = 1; n < 200; n++) {
        t *= x / (a + n);
        s += t;

        if (Math.abs(t) < 1e-14 * Math.abs(s)) {
            break;
        }
    }

    return s * Math.exp(-x + a * Math.log(x) - gammaln(a));
};

const gammaQ = (a: number, x: number): number => {
    let b = x + 1 - a;
    let c = 1 / 1e-30;
    let d = 1 / b;
    let h = d;

    for (let i = 1; i <= 200; i++) {
        const an = -i * (i - a);
        b += 2;
        d = an * d + b;

        if (Math.abs(d) < 1e-30) {
            d = 1e-30;
        }

        c = b + an / c;

        if (Math.abs(c) < 1e-30) {
            c = 1e-30;
        }

        d = 1 / d;
        h *= d * c;

        if (Math.abs(d * c - 1) < 1e-12) {
            break;
        }
    }

    return h * Math.exp(-x + a * Math.log(x) - gammaln(a));
};
