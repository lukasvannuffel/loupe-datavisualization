import { type NextRequest, type NextResponse } from "next/server";

import { buildSecurityHeaders } from "@/lib/security-headers";
import { updateSession } from "@/utils/supabase/middleware";

const NONCE_REQUEST_HEADER = "x-nonce";
const CSP_HEADER = "Content-Security-Policy";

export const proxy = async (request: NextRequest): Promise<NextResponse> => {
    const { nonce, csp } = buildSecurityHeaders();

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(NONCE_REQUEST_HEADER, nonce);
    requestHeaders.set(CSP_HEADER, csp);

    const response = await updateSession(request, requestHeaders);
    response.headers.set(CSP_HEADER, csp);

    return response;
};

export const config = {
    matcher: [
        // Match all request paths except for:
        // - _next/static (static files)
        // - _next/image (image optimization files)
        // - favicon.ico
        // - common image / font extensions
        // - 149e9513-... (Vercel BotID challenge proxy — registered via withBotId)
        "/((?!_next/static|_next/image|favicon.ico|149e9513-01fa-4fb0-aad4-566afd725d1b|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf)$).*)",
    ],
};
