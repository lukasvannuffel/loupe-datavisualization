import { describe, expect, it } from "vitest";

import { methodString } from "../methodStrings";

describe("methodString", () => {
    it("returns the reviewed string for each chart kind", () => {
        expect(methodString("barError")).toBe("Mean ± CI95 (t-distribution, df=n−1)");
        expect(methodString("km")).toBe("Kaplan-Meier estimator, Greenwood log-log CI");
        expect(methodString("box")).toBe("Tukey box plot (type-7 quantiles)");
        expect(methodString("xy")).toBe("OLS regression");
    });
});
