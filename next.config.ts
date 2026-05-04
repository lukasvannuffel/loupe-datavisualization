import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    reactCompiler: true,
    reactStrictMode: true,
    turbopack: {
        root: __dirname,
    },
};

export default nextConfig;
