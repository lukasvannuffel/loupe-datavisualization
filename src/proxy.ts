import type { NextRequest, NextResponse } from "next/server";

import { updateSession } from "@/utils/supabase/middleware";

export const proxy = async (request: NextRequest): Promise<NextResponse> => {
    return updateSession(request);
};

export const config = {
    matcher: [
        // Match all request paths except for:
        // - _next/static (static files)
        // - _next/image (image optimization files)
        // - favicon.ico
        // - common image / font extensions
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf)$).*)",
    ],
};
