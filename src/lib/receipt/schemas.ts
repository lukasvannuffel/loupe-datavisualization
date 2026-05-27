import { z } from "zod";

export const receiptSchema = z
    .object({
        generated_at: z.string().datetime({ offset: true }),
        config_hash: z.string().regex(/^sha256·[a-f0-9]{6,8}…[a-f0-9]{4}$/),
        method: z.string().min(1).max(200),
        sample: z.string().min(1).max(200),
        palette: z.enum([
            "monochrome",
            "editorial",
            "okabe-ito",
            "wong",
            "ibm-design",
            "tol-vibrant",
            "deuteranopia-tuned",
        ]),
        software: z.string().regex(/^Loupe v\d+\.\d+\.\d+ · client-side$/),
        ai_rationale: z.string().min(1).max(2000),
        csv_columns: z.array(z.string().min(1).max(100)).min(1).max(50).readonly(),
        n_rows_input: z.number().int().positive().max(1_000_000),
    })
    .strict();

export type Receipt = z.infer<typeof receiptSchema>;
