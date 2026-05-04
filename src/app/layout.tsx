import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import type { ReactNode } from "react";

import { FooterGate } from "@/components/chrome/FooterGate";
import { TopNav } from "@/components/chrome/TopNav";

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

const RootLayout = ({ children }: RootLayoutProps): JSX.Element => (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} ${sourceSerif.variable}`}>
        <body>
            <AppStateProvider>
                <div className="shell">
                    <TopNav />
                    <main style={{ flex: 1 }}>{children}</main>
                    <FooterGate />
                </div>
            </AppStateProvider>
        </body>
    </html>
);

export default RootLayout;
