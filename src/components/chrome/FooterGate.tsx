"use client";

import { usePathname } from "next/navigation";

import { Footer } from "./Footer";

export const FooterGate = (): JSX.Element | null => {
    const pathname = usePathname() ?? "/";
    if (pathname === "/auth") {
        return null;
    }

    return <Footer />;
};
