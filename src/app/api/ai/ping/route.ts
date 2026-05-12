import { pingModel } from "@/lib/ai/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Only GET exported by design — Next.js returns 405 for other methods automatically. Do not add POST without explicit ticket scope.
export const GET = async (): Promise<Response> => {
    const result = await pingModel();

    return Response.json(result, { status: result.ok ? 200 : 500 });
};
