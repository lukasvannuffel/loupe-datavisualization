import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
    ...nextVitals,
    ...nextTs,
    {
        rules: {
            "react/no-unescaped-entities": "off",
            "@next/next/no-img-element": "off",
        },
    },
    {
        // Ported prototype code (pages + charts) is held to prototype parity.
        // Refactoring these to satisfy React 19 / React Compiler advisory rules
        // is tracked separately; until then, the patterns ship as-is.
        files: [
            "src/components/pages/**/*.{ts,tsx}",
            "src/components/charts/**/*.{ts,tsx}",
        ],
        rules: {
            "react-hooks/set-state-in-effect": "off",
            "react-hooks/static-components": "off",
            "react-hooks/purity": "off",
        },
    },
    globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
