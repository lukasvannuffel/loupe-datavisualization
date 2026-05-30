import * as XLSX from "xlsx";

export const csvFile = (text: string, name = "fixture.csv"): File =>
    new File([text], name, { type: "text/csv" });

export const xlsxBufferFromSheets = (
    sheets: ReadonlyArray<{ readonly name: string; readonly rows: readonly (readonly string[])[] }>,
): ArrayBuffer => {
    const workbook = XLSX.utils.book_new();

    for (const sheet of sheets) {
        XLSX.utils.book_append_sheet(
            workbook,
            XLSX.utils.aoa_to_sheet(sheet.rows.map((row) => [...row])),
            sheet.name,
        );
    }

    return XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
};

export const xlsxFileFromSheets = (
    sheets: ReadonlyArray<{ readonly name: string; readonly rows: readonly (readonly string[])[] }>,
    name = "fixture.xlsx",
): File => {
    const buffer = xlsxBufferFromSheets(sheets);

    return new File([buffer], name, {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
};

export const sevenSheetMetas = (): readonly { readonly name: string; readonly rowCount: number }[] => {
    const clinicalArms = [
        "Baseline",
        "Codebook",
        "Arm_A",
        "Arm_B",
        "Derived",
        "AdverseEvents",
        "Summary",
    ] as const;

    return clinicalArms.map((name, index) => ({
        name,
        rowCount: index === 5 ? 842 : 12 + index,
    }));
};
