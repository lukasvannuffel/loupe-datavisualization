import type { ChartSpec, PlotData } from "@/lib/chartSpec/types";

const FORBIDDEN_KEY_PATTERN = /patient|subject|record|row|id$|identifier/i;
const ACCEPTED_KINDS_FOR_SPEC: Record<ChartSpec["kind"], ReadonlySet<string>> = {
    barError: new Set(["barError"]),
    box: new Set(["box"]),
    km: new Set(["km"]),
    xy: new Set(["xy", "longitudinal"]),
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    value !== null && typeof value === "object" && !Array.isArray(value);

const assertRecord = (value: unknown, path: string): Record<string, unknown> => {
    if (!isRecord(value)) {
        throw new Error(`Privacy violation: expected object at "${path}"`);
    }

    return value;
};

const assertExactKeys = (value: Record<string, unknown>, keys: readonly string[], path: string): void => {
    const actual = Object.keys(value).sort();
    const expected = [...keys].sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new Error(`Privacy violation: unexpected keys at "${path}"`);
    }
};

const assertString = (value: unknown, path: string): void => {
    if (typeof value !== "string") {
        throw new Error(`Privacy violation: expected string at "${path}"`);
    }
};

const assertNumber = (value: unknown, path: string): void => {
    if (typeof value !== "number" || Number.isNaN(value)) {
        throw new Error(`Privacy violation: expected number at "${path}"`);
    }
};

const assertFiniteOrNaNNumber = (value: unknown, path: string): void => {
    if (typeof value !== "number" || (!Number.isFinite(value) && !Number.isNaN(value))) {
        throw new Error(`Privacy violation: expected number at "${path}"`);
    }
};

const assertBoolean = (value: unknown, path: string): void => {
    if (typeof value !== "boolean") {
        throw new Error(`Privacy violation: expected boolean at "${path}"`);
    }
};

const walkKeys = (value: unknown, path: string): void => {
    if (Array.isArray(value)) {
        value.forEach((entry, index) => walkKeys(entry, `${path}[${index}]`));
        return;
    }
    if (!isRecord(value)) {
        return;
    }
    for (const key of Object.keys(value)) {
        if (FORBIDDEN_KEY_PATTERN.test(key)) {
            throw new Error(`Privacy violation: forbidden key "${key}" at path "${path}"`);
        }
        walkKeys(value[key], path === "" ? key : `${path}.${key}`);
    }
};

const assertBarErrorShape = (plotData: unknown): void => {
    const root = assertRecord(plotData, "plot_data");
    assertExactKeys(root, ["kind", "groups"], "plot_data");
    if (root.kind !== "barError") {
        throw new Error("Privacy violation: expected barError plot_data kind");
    }
    if (!Array.isArray(root.groups)) {
        throw new Error('Privacy violation: expected array at "plot_data.groups"');
    }
    root.groups.forEach((group, index) => {
        const groupRecord = assertRecord(group, `plot_data.groups[${index}]`);
        assertExactKeys(groupRecord, ["label", "mean", "sd", "n"], `plot_data.groups[${index}]`);
        assertString(groupRecord.label, `plot_data.groups[${index}].label`);
        assertNumber(groupRecord.mean, `plot_data.groups[${index}].mean`);
        assertNumber(groupRecord.sd, `plot_data.groups[${index}].sd`);
        assertNumber(groupRecord.n, `plot_data.groups[${index}].n`);
    });
};

const assertKMShape = (plotData: unknown): void => {
    const root = assertRecord(plotData, "plot_data");
    assertExactKeys(root, ["kind", "groups", "tMax"], "plot_data");
    if (root.kind !== "km") {
        throw new Error("Privacy violation: expected km plot_data kind");
    }
    assertNumber(root.tMax, "plot_data.tMax");
    if (!Array.isArray(root.groups)) {
        throw new Error('Privacy violation: expected array at "plot_data.groups"');
    }
    root.groups.forEach((group, groupIndex) => {
        const groupPath = `plot_data.groups[${groupIndex}]`;
        const groupRecord = assertRecord(group, groupPath);
        assertExactKeys(groupRecord, ["label", "points", "atRiskTicks", "nTotal", "nEvents"], groupPath);
        assertString(groupRecord.label, `${groupPath}.label`);
        assertNumber(groupRecord.nTotal, `${groupPath}.nTotal`);
        assertNumber(groupRecord.nEvents, `${groupPath}.nEvents`);
        if (!Array.isArray(groupRecord.points)) {
            throw new Error(`Privacy violation: expected array at "${groupPath}.points"`);
        }
        groupRecord.points.forEach((point, pointIndex) => {
            const pointPath = `${groupPath}.points[${pointIndex}]`;
            const pointRecord = assertRecord(point, pointPath);
            assertExactKeys(
                pointRecord,
                ["t", "survival", "nAtRisk", "censored", "ciLower", "ciUpper"],
                pointPath,
            );
            assertNumber(pointRecord.t, `${pointPath}.t`);
            assertNumber(pointRecord.survival, `${pointPath}.survival`);
            assertNumber(pointRecord.nAtRisk, `${pointPath}.nAtRisk`);
            assertBoolean(pointRecord.censored, `${pointPath}.censored`);
            assertFiniteOrNaNNumber(pointRecord.ciLower, `${pointPath}.ciLower`);
            assertFiniteOrNaNNumber(pointRecord.ciUpper, `${pointPath}.ciUpper`);
        });
        if (!Array.isArray(groupRecord.atRiskTicks)) {
            throw new Error(`Privacy violation: expected array at "${groupPath}.atRiskTicks"`);
        }
        groupRecord.atRiskTicks.forEach((tick, tickIndex) => {
            const tickPath = `${groupPath}.atRiskTicks[${tickIndex}]`;
            const tickRecord = assertRecord(tick, tickPath);
            assertExactKeys(tickRecord, ["t", "nAtRisk"], tickPath);
            assertNumber(tickRecord.t, `${tickPath}.t`);
            assertNumber(tickRecord.nAtRisk, `${tickPath}.nAtRisk`);
        });
    });
};

const assertBoxShape = (plotData: unknown): void => {
    const root = assertRecord(plotData, "plot_data");
    assertExactKeys(root, ["kind", "groups", "yMin", "yMax"], "plot_data");
    if (root.kind !== "box") {
        throw new Error("Privacy violation: expected box plot_data kind");
    }
    assertNumber(root.yMin, "plot_data.yMin");
    assertNumber(root.yMax, "plot_data.yMax");
    if (!Array.isArray(root.groups)) {
        throw new Error('Privacy violation: expected array at "plot_data.groups"');
    }
    root.groups.forEach((group, index) => {
        const path = `plot_data.groups[${index}]`;
        const groupRecord = assertRecord(group, path);
        assertString(groupRecord.kind, `${path}.kind`);
        if (groupRecord.kind === "box") {
            assertExactKeys(
                groupRecord,
                [
                    "kind",
                    "label",
                    "n",
                    "min",
                    "q1",
                    "median",
                    "q3",
                    "max",
                    "mean",
                    "outliers",
                    "notchLower",
                    "notchUpper",
                ],
                path,
            );
            assertString(groupRecord.label, `${path}.label`);
            assertNumber(groupRecord.n, `${path}.n`);
            assertNumber(groupRecord.min, `${path}.min`);
            assertNumber(groupRecord.q1, `${path}.q1`);
            assertNumber(groupRecord.median, `${path}.median`);
            assertNumber(groupRecord.q3, `${path}.q3`);
            assertNumber(groupRecord.max, `${path}.max`);
            assertNumber(groupRecord.mean, `${path}.mean`);
            assertNumber(groupRecord.notchLower, `${path}.notchLower`);
            assertNumber(groupRecord.notchUpper, `${path}.notchUpper`);
            if (!Array.isArray(groupRecord.outliers)) {
                throw new Error(`Privacy violation: expected array at "${path}.outliers"`);
            }
            groupRecord.outliers.forEach((outlier, outlierIndex) => {
                assertNumber(outlier, `${path}.outliers[${outlierIndex}]`);
            });
            return;
        }
        if (groupRecord.kind === "strip") {
            assertExactKeys(groupRecord, ["kind", "label", "n", "values"], path);
            assertString(groupRecord.label, `${path}.label`);
            assertNumber(groupRecord.n, `${path}.n`);
            if (!Array.isArray(groupRecord.values)) {
                throw new Error(`Privacy violation: expected array at "${path}.values"`);
            }
            groupRecord.values.forEach((entry, valueIndex) => {
                assertNumber(entry, `${path}.values[${valueIndex}]`);
            });
            return;
        }
        throw new Error(`Privacy violation: unexpected box group kind at "${path}"`);
    });
};

const assertXYShape = (plotData: unknown): void => {
    const root = assertRecord(plotData, "plot_data");
    assertExactKeys(
        root,
        ["kind", "groups", "regressions", "regressionSkipped", "xMin", "xMax", "yMin", "yMax"],
        "plot_data",
    );
    if (root.kind !== "xy") {
        throw new Error("Privacy violation: expected xy plot_data kind");
    }
    assertNumber(root.xMin, "plot_data.xMin");
    assertNumber(root.xMax, "plot_data.xMax");
    assertNumber(root.yMin, "plot_data.yMin");
    assertNumber(root.yMax, "plot_data.yMax");
    assertBoolean(root.regressionSkipped, "plot_data.regressionSkipped");
    if (!Array.isArray(root.groups)) {
        throw new Error('Privacy violation: expected array at "plot_data.groups"');
    }
    root.groups.forEach((group, groupIndex) => {
        const path = `plot_data.groups[${groupIndex}]`;
        const groupRecord = assertRecord(group, path);
        assertExactKeys(groupRecord, ["label", "points"], path);
        assertString(groupRecord.label, `${path}.label`);
        if (!Array.isArray(groupRecord.points)) {
            throw new Error(`Privacy violation: expected array at "${path}.points"`);
        }
        groupRecord.points.forEach((point, pointIndex) => {
            const pointPath = `${path}.points[${pointIndex}]`;
            const pointRecord = assertRecord(point, pointPath);
            assertExactKeys(pointRecord, ["x", "y"], pointPath);
            assertNumber(pointRecord.x, `${pointPath}.x`);
            assertNumber(pointRecord.y, `${pointPath}.y`);
        });
    });
    if (!Array.isArray(root.regressions)) {
        throw new Error('Privacy violation: expected array at "plot_data.regressions"');
    }
    root.regressions.forEach((regression, regressionIndex) => {
        const path = `plot_data.regressions[${regressionIndex}]`;
        const regressionRecord = assertRecord(regression, path);
        assertExactKeys(regressionRecord, ["label", "slope", "intercept", "r2"], path);
        assertString(regressionRecord.label, `${path}.label`);
        assertNumber(regressionRecord.slope, `${path}.slope`);
        assertNumber(regressionRecord.intercept, `${path}.intercept`);
        assertNumber(regressionRecord.r2, `${path}.r2`);
    });
};

const assertLongitudinalShape = (plotData: unknown): void => {
    const root = assertRecord(plotData, "plot_data");
    assertExactKeys(root, ["kind", "groups", "xMin", "xMax", "yMin", "yMax"], "plot_data");
    if (root.kind !== "longitudinal") {
        throw new Error("Privacy violation: expected longitudinal plot_data kind");
    }
    assertNumber(root.xMin, "plot_data.xMin");
    assertNumber(root.xMax, "plot_data.xMax");
    assertNumber(root.yMin, "plot_data.yMin");
    assertNumber(root.yMax, "plot_data.yMax");
    if (!Array.isArray(root.groups)) {
        throw new Error('Privacy violation: expected array at "plot_data.groups"');
    }
    root.groups.forEach((group, groupIndex) => {
        const path = `plot_data.groups[${groupIndex}]`;
        const groupRecord = assertRecord(group, path);
        assertExactKeys(groupRecord, ["label", "points"], path);
        assertString(groupRecord.label, `${path}.label`);
        if (!Array.isArray(groupRecord.points)) {
            throw new Error(`Privacy violation: expected array at "${path}.points"`);
        }
        groupRecord.points.forEach((point, pointIndex) => {
            const pointPath = `${path}.points[${pointIndex}]`;
            const pointRecord = assertRecord(point, pointPath);
            assertExactKeys(pointRecord, ["visit", "mean", "sem", "n"], pointPath);
            assertNumber(pointRecord.visit, `${pointPath}.visit`);
            assertNumber(pointRecord.mean, `${pointPath}.mean`);
            assertNumber(pointRecord.sem, `${pointPath}.sem`);
            assertNumber(pointRecord.n, `${pointPath}.n`);
        });
    });
};

export const assertNoRawRows = (chartSpec: ChartSpec, plotData: PlotData): void => {
    const root = assertRecord(plotData, "plot_data");
    const dataKind = root.kind;
    if (!ACCEPTED_KINDS_FOR_SPEC[chartSpec.kind].has(String(dataKind))) {
        throw new Error(`Plot data kind mismatch: spec is ${chartSpec.kind}, data is ${String(dataKind)}`);
    }

    walkKeys(plotData, "");

    switch (chartSpec.kind) {
        case "barError":
            assertBarErrorShape(plotData);
            return;
        case "km":
            assertKMShape(plotData);
            return;
        case "box":
            assertBoxShape(plotData);
            return;
        case "xy":
            if (dataKind === "longitudinal") {
                assertLongitudinalShape(plotData);
                return;
            }
            assertXYShape(plotData);
            return;
    }
};
