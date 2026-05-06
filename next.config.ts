import type { NextConfig } from "next";
import { withBotId } from "botid/next/config";

const isProduction = process.env.NODE_ENV === "production";

const securityHeaders = [
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ...(isProduction
        ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
        : []),
];

const nextConfig: NextConfig = {
    reactCompiler: true,
    reactStrictMode: true,
    turbopack: {
        root: __dirname,
    },
    experimental: {
        serverActions: {
            bodySizeLimit: "5mb",
        },
    },
    async headers() {
        return [
            {
                source: "/:path*",
                headers: securityHeaders,
            },
        ];
    },
};

export default withBotId(nextConfig);
