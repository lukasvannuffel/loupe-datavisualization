/**
 * Generates deterministic XLSX fixtures under src/lib/parser/__tests__/fixtures/.
 * Run from repo root: node scripts/generate-parser-fixtures.cjs
 */
/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS fixture generator */
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const fixturesDir = path.join(__dirname, "../src/lib/parser/__tests__/fixtures");

fs.mkdirSync(fixturesDir, { recursive: true });

const write = (fileName, workbook) => {
    const target = path.join(fixturesDir, fileName);

    XLSX.writeFile(workbook, target);
    process.stdout.write(`wrote ${target}\n`);
};

{
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.aoa_to_sheet([
            ["h1", "h2"],
            [1, 2],
        ]),
        "Sheet1",
    );
    XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.aoa_to_sheet([["a"], [9]]),
        "Sheet2",
    );
    XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.aoa_to_sheet([["b"], [8]]),
        "Sheet3",
    );
    write("three-sheets.xlsx", workbook);
}

{
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.aoa_to_sheet([
            ["x", "y"],
            [3, 4],
        ]),
        "Only",
    );
    write("one-sheet.xlsx", workbook);
}

{
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([]), "E1");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([]), "E2");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([]), "E3");
    write("three-empty.xlsx", workbook);
}

{
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([]), "Empty");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["p"], [1]]), "DataA");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["q"], [2]]), "DataB");
    write("mixed-empty-valid.xlsx", workbook);
}
