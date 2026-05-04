"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Eyebrow } from "@/components/primitives/Eyebrow";
import { useAppState, type ColumnRole } from "@/app/providers";
import { SAMPLE_COLUMNS } from "./sampleData";

type RoleOption = {
    value: ColumnRole;
    label: string;
};

const ROLE_OPTIONS: readonly RoleOption[] = [
    { value: "ignore", label: "— Ignore —" },
    { value: "id", label: "Identifier" },
    { value: "time", label: "Time variable" },
    { value: "event", label: "Event indicator" },
    { value: "group", label: "Group / arm" },
    { value: "outcome", label: "Outcome" },
    { value: "predictor", label: "Predictor" },
    { value: "x", label: "X axis" },
    { value: "y", label: "Y axis" },
];

const ROLE_HINT_BY_TYPE: Record<string, ColumnRole> = {
    id: "id",
    "tt-event": "event",
    numeric: "outcome",
    categorical: "group",
};

const PLACEHOLDERS: readonly string[] = [
    "Compare 5-year survival between treatment arms…",
    "Show distribution of tumor sizes by stage…",
    "Plot hazard ratios across pre-specified subgroups…",
    "Compare biomarker concordance between two assays…",
];

export const UploadMap = (): JSX.Element => {
    const router = useRouter();
    const { intent, setIntent, mapping, setMapping } = useAppState();

    const [phIndex, setPhIndex] = useState<number>(0);

    useEffect(() => {
        const t = setInterval(() => setPhIndex((i) => (i + 1) % PLACEHOLDERS.length), 3500);

        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        if (Object.keys(mapping).length > 0) {
            return;
        }

        const seeded: Record<string, ColumnRole> = {};
        SAMPLE_COLUMNS.forEach((c) => {
            seeded[c.name] = ROLE_HINT_BY_TYPE[c.type] ?? "ignore";
        });

        if (seeded["time_to_event_months"]) {
            seeded["time_to_event_months"] = "time";
        }

        if (seeded["treatment_arm"]) {
            seeded["treatment_arm"] = "group";
        }

        setMapping(seeded);
    }, [mapping, setMapping]);

    const onChangeRole = (column: string, role: ColumnRole): void => {
        const next = { ...mapping, [column]: role };
        setMapping(next);
    };

    const onContinue = (): void => {
        if (!intent) {
            setIntent("Compare 5-year survival between treatment arms");
        }

        router.push("/recommend");
    };

    const assignedRoles = Object.values(mapping);
    const filledCount = assignedRoles.filter((r) => r !== "ignore").length;

    return (
        <div className="upload-page page-enter">
            <div className="container">
                <div className="upload-head">
                    <div>
                        <Eyebrow>Step 2 · Map &amp; describe</Eyebrow>
                        <h1 className="upload-title">Tell Loupe what each column means.</h1>
                    </div>
                    <div className="upload-head-meta muted">02 / 03 · MAP &amp; DESCRIBE</div>
                </div>

                <div className="map-summary">
                    <div className="map-summary-row">
                        <span className="muted">
                            {SAMPLE_COLUMNS.length} columns detected · {filledCount} mapped
                        </span>
                        <Link href="/upload" className="btn btn--quiet btn--sm">
                            ← Replace file
                        </Link>
                    </div>
                </div>

                <div className="map-table">
                    <div className="map-row map-row--head">
                        <span>Column</span>
                        <span>Type</span>
                        <span>Coverage</span>
                        <span>Chart role</span>
                    </div>
                    {SAMPLE_COLUMNS.map((c) => {
                        const range = c.range ? `${c.range[0]} – ${c.range[1]}` : null;
                        const distinct = c.distinct ? `${c.distinct} distinct` : null;
                        const coverage = c.missing > 0 ? `missing: ${c.missing}` : "complete";
                        const role = mapping[c.name] ?? "ignore";

                        return (
                            <div className="map-row" key={c.name}>
                                <div className="map-cell map-cell--name">
                                    <span className="mono">{c.name}</span>
                                    <span className="map-cell-samples muted">
                                        ex: {c.samples.slice(0, 3).join(", ")}
                                    </span>
                                </div>
                                <div className="map-cell">
                                    <span
                                        className={
                                            "col-type tt-" + (c.type === "tt-event" ? "event" : "")
                                        }
                                    >
                                        {c.type === "tt-event" ? "event" : c.type}
                                    </span>
                                    <span className="muted map-cell-detail">
                                        {range ?? distinct ?? "—"}
                                    </span>
                                </div>
                                <div className="map-cell">
                                    <span
                                        className={
                                            "map-coverage " +
                                            (c.missing > 0 ? "is-warn" : "is-ok")
                                        }
                                    >
                                        {coverage}
                                    </span>
                                </div>
                                <div className="map-cell">
                                    <select
                                        className="map-role"
                                        value={role}
                                        onChange={(e) =>
                                            onChangeRole(c.name, e.target.value as ColumnRole)
                                        }
                                    >
                                        {ROLE_OPTIONS.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="intent-block">
                    <Eyebrow>Step 3 · Describe what you found</Eyebrow>
                    <div className="intent-input-wrap">
                        <textarea
                            className="textarea"
                            value={intent}
                            onChange={(e) => setIntent(e.target.value)}
                            placeholder=""
                            rows={3}
                        />
                        {!intent && (
                            <div className="intent-rotator" key={phIndex}>
                                {PLACEHOLDERS[phIndex]}
                            </div>
                        )}
                    </div>
                    <div className="intent-meta">
                        <span className="muted intent-meta-note">
                            Plain language. No statistics jargon required.
                        </span>
                        <button
                            type="button"
                            className="btn btn--primary btn--lg"
                            onClick={onContinue}
                        >
                            Get recommendation <span className="arrow">→</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
