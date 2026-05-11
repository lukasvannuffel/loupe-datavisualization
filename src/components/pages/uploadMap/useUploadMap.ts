import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";

import { useAppState, type ColumnRole } from "@/app/providers";
import type { ColumnInference } from "@/lib/parser/inference.types";
import { autoMapColumns, validateMapping, type ValidationResult } from "@/lib/roles";

import { assignRole } from "./uploadMap.types";

type UploadMapApi = {
    readonly inferences: readonly ColumnInference[];
    readonly validation: ValidationResult;
    readonly continueDisabled: boolean;
    readonly onChangeRole: (column: string, role: ColumnRole) => void;
    readonly onReplace: () => void;
    readonly onContinue: () => void;
};

export const useUploadMap = (): UploadMapApi => {
    const router = useRouter();
    const { intent, mapping, setMapping, dataset, clearDataset } = useAppState();
    const autoMapped = useRef<boolean>(false);

    useEffect(() => {
        if (dataset === null) {
            router.replace("/upload");
        }
    }, [dataset, router]);

    useEffect(() => {
        if (autoMapped.current || dataset === null || Object.keys(mapping).length > 0) {
            return;
        }
        autoMapped.current = true;
        const seeded = autoMapColumns(dataset);
        if (Object.keys(seeded).length > 0) {
            setMapping(seeded);
        }
    }, [dataset, mapping, setMapping]);

    const inferences = useMemo<readonly ColumnInference[]>(() => dataset ?? [], [dataset]);
    const validation = useMemo(() => validateMapping(mapping, inferences), [mapping, inferences]);
    const continueDisabled = validation.status !== "valid" || intent.trim().length === 0;

    return {
        inferences,
        validation,
        continueDisabled,
        onChangeRole: (column, role) => setMapping(assignRole(mapping, column, role)),
        onReplace: () => {
            clearDataset();
            setMapping({});
            router.push("/upload");
        },
        onContinue: () => router.push("/recommend"),
    };
};
