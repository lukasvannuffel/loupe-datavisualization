import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import { cookies } from "next/headers";
import type { ReactNode } from "react";

import { FooterGate } from "@/components/chrome/FooterGate";
import { TopNav, type TopNavUser } from "@/components/chrome/TopNav";
import { displayNameFor, loadProfile } from "@/lib/profile";
import { createClient } from "@/utils/supabase/server";

import { AppStateProvider } from "./providers";

import "./globals.css";

const inter = Inter({
    subsets: ["latin"],
    weight: ["400", "500", "600"],
    variable: "--font-inter",
    display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
    subsets: ["latin"],
    weight: ["400", "500"],
    variable: "--font-jetbrains-mono",
    display: "swap",
});

const sourceSerif = Source_Serif_4({
    subsets: ["latin"],
    weight: ["400", "500", "600"],
    style: ["normal", "italic"],
    variable: "--font-source-serif",
    display: "swap",
});

export const metadata: Metadata = {
    title: "Loupe — Start with the finding, not the format.",
    description: "Publication-ready medical charts. No code. No data ever leaves your browser.",
};

type RootLayoutProps = {
    children: ReactNode;
};

const RootLayout = async ({ children }: RootLayoutProps): Promise<JSX.Element> => {
    const supabase = createClient(await cookies());
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const navUser: TopNavUser | null = await (async (): Promise<TopNavUser | null> => {
        if (user === null) {
            return null;
        }

        const profile = await loadProfile(supabase, user.id);
        const email = user.email ?? "";

        return {
            email,
            displayName: displayNameFor(profile, email),
            avatarUrl: profile.avatarUrl,
        };
    })();

    return (
        <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} ${sourceSerif.variable}`}>
            <head>
                <meta name="apple-mobile-web-app-title" content="Loupe" />
            </head>
            <body>
                <AppStateProvider>
                    <div className="shell">
                        <TopNav user={navUser} />
                        <main style={{ flex: 1 }}>{children}</main>
                        <FooterGate />
                    </div>
                </AppStateProvider>
            </body>
        </html>
    );
};

export default RootLayout;
