import type { NextConfig } from "next";

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
};

export default nextConfig;
