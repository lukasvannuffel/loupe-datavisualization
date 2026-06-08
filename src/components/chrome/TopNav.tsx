"use client";

import type { AuthChangeEvent } from "@supabase/supabase-js";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { signOut } from "@/app/auth/actions";
import { AccountMenu } from "@/components/chrome/AccountMenu";
import { Wordmark } from "@/components/primitives/Wordmark";
import { createClient } from "@/utils/supabase/client";

export type TopNavUser = {
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
};

type NavLinkSpec = {
    href: string;
    label: string;
};

type TopNavProps = {
    user: TopNavUser | null;
};

const NAV_LINKS: readonly NavLinkSpec[] = [
    { href: "/upload", label: "Create" },
    { href: "/library", label: "Chart types" },
    { href: "/dashboard", label: "Dashboard" },
];

const isActive = (pathname: string, href: string): boolean => {
    if (href === "/") {
        return pathname === "/";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
};

export const TopNav = ({ user }: TopNavProps): JSX.Element => {
    const pathname = usePathname() ?? "/";
    const router = useRouter();

    const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
    const [isScrolled, setIsScrolled] = useState<boolean>(false);
    const toggleRef = useRef<HTMLButtonElement | null>(null);

    const isAuthedView = user !== null;

    useEffect(() => {
        const supabase = createClient();
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event: AuthChangeEvent) => {
            if (event === "INITIAL_SESSION") {
                return;
            }

            router.refresh();
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [router]);

    useEffect(() => {
        // Safety net: close the drawer if the route changes via a non-drawer path
        // (e.g. browser back/forward). Mobile drawer clicks already close via navigate().
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDrawerOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (!drawerOpen) {
            return;
        }

        const onKey = (e: KeyboardEvent): void => {
            if (e.key === "Escape") {
                setDrawerOpen(false);
            }
        };

        window.addEventListener("keydown", onKey);
        document.body.classList.add("is-locked");

        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.classList.remove("is-locked");
        };
    }, [drawerOpen]);

    useEffect(() => {
        let rafId: number | null = null;
        let lastScrollY = window.scrollY;

        const onScroll = (): void => {
            lastScrollY = window.scrollY;
            if (rafId !== null) {
                return;
            }
            rafId = window.requestAnimationFrame(() => {
                setIsScrolled(lastScrollY > 80);
                rafId = null;
            });
        };

        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();

        return () => {
            window.removeEventListener("scroll", onScroll);
            if (rafId !== null) {
                window.cancelAnimationFrame(rafId);
            }
        };
    }, []);

    const closeDrawer = (): void => {
        setDrawerOpen(false);
        toggleRef.current?.focus();
    };

    const navigate = (href: string): void => {
        setDrawerOpen(false);
        router.push(href);
    };

    return (
        <>
            <nav className={"nav" + (isScrolled ? " is-scrolled" : "")}>
                <div className="container nav-inner">
                    <div className="nav-left">
                        <Link href="/" aria-label="Loupe home">
                            <Wordmark />
                        </Link>
                        <div className="nav-links">
                            {NAV_LINKS.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={"nav-link" + (isActive(pathname, link.href) ? " active" : "")}
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                    <div className="nav-right">
                        {!isAuthedView ? (
                            <>
                                <button
                                    type="button"
                                    className="btn btn--quiet btn--sm"
                                    onClick={() => router.push("/auth")}
                                >
                                    Sign in
                                </button>
                                <button
                                    type="button"
                                    className="btn btn--primary btn--sm"
                                    onClick={() => router.push("/upload")}
                                >
                                    Start creating
                                </button>
                            </>
                        ) : (
                            <AccountMenu user={user} />
                        )}
                    </div>
                    <button
                        ref={toggleRef}
                        type="button"
                        className="nav-toggle"
                        aria-expanded={drawerOpen}
                        aria-controls="nav-drawer"
                        aria-label={drawerOpen ? "Close menu" : "Open menu"}
                        onClick={() => setDrawerOpen((v) => !v)}
                    >
                        <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
                            <line x1="3" y1="6" x2="19" y2="6" stroke="currentColor" strokeWidth="1.4" />
                            <line x1="3" y1="11" x2="19" y2="11" stroke="currentColor" strokeWidth="1.4" />
                            <line x1="3" y1="16" x2="19" y2="16" stroke="currentColor" strokeWidth="1.4" />
                        </svg>
                    </button>
                </div>
            </nav>

            <div
                className={"nav-scrim" + (drawerOpen ? " is-open" : "")}
                onClick={closeDrawer}
                aria-hidden="true"
            />
            <aside
                id="nav-drawer"
                className={"nav-drawer" + (drawerOpen ? " is-open" : "")}
                role="dialog"
                aria-modal={drawerOpen ? "true" : undefined}
                aria-label="Site navigation"
                inert={!drawerOpen}
            >
                <div className="nav-drawer-head">
                    <Wordmark size={18} />
                    <button
                        type="button"
                        className="nav-drawer-close"
                        aria-label="Close menu"
                        onClick={closeDrawer}
                    >
                        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                            <line x1="3" y1="3" x2="15" y2="15" stroke="currentColor" strokeWidth="1.4" />
                            <line x1="15" y1="3" x2="3" y2="15" stroke="currentColor" strokeWidth="1.4" />
                        </svg>
                    </button>
                </div>
                <nav className="nav-drawer-links" aria-label="Primary">
                    {NAV_LINKS.map((link) => (
                        <button
                            key={link.href}
                            type="button"
                            className={
                                "nav-drawer-link" + (isActive(pathname, link.href) ? " active" : "")
                            }
                            onClick={() => navigate(link.href)}
                        >
                            {link.label}
                        </button>
                    ))}
                </nav>
                <div className="nav-drawer-actions">
                    {!isAuthedView ? (
                        <>
                            <button
                                type="button"
                                className="btn btn--secondary btn--lg"
                                onClick={() => navigate("/auth")}
                            >
                                Sign in
                            </button>
                            <button
                                type="button"
                                className="btn btn--primary btn--lg"
                                onClick={() => navigate("/upload")}
                            >
                                Start creating <span className="arrow">→</span>
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                className="btn btn--secondary btn--lg"
                                onClick={() => navigate("/account")}
                            >
                                Account
                            </button>
                            <form action={signOut}>
                                <button type="submit" className="btn btn--primary btn--lg">
                                    Sign out <span className="arrow">→</span>
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </aside>
        </>
    );
};
