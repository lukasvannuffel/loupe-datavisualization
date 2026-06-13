import { z } from "zod";

export const receiptSchema = z
    .object({
        generated_at: z.string().datetime({ offset: true }),
        config_hash: z.string().regex(/^[a-f0-9]{64}$/),
        method: z.string().min(1).max(200),
        sample: z.string().min(1).max(200),
        palette: z.union([
            z.enum([
                "monochrome",
                "editorial",
                "okabe-ito",
                "wong",
                "ibm-design",
                "tol-vibrant",
                "deuteranopia-tuned",
            ]),
            z.string().uuid(),
        ]),
        software: z.string().regex(/^Loupe v\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)? · client-side$/),
        ai_rationale: z.string().min(1).max(2000),
        csv_columns: z.array(z.string().min(1).max(100)).min(1).max(50).readonly(),
        n_rows_input: z.number().int().positive().max(1_000_000),
    })
    .strict();

export type Receipt = z.infer<typeof receiptSchema>;
