"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { signOut } from "@/app/auth/actions";
import { initialsFromNameOrEmail } from "@/lib/profile";

export type AccountMenuUser = {
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
};

type AccountMenuProps = {
    user: AccountMenuUser;
};

export const AccountMenu = ({ user }: AccountMenuProps): JSX.Element => {
    const pathname = usePathname() ?? "/";
    const router = useRouter();

    const [open, setOpen] = useState<boolean>(false);
    const wrapRef = useRef<HTMLDivElement | null>(null);
    const buttonRef = useRef<HTMLButtonElement | null>(null);

    const labelSource = user.displayName !== null && user.displayName !== "" ? user.displayName : user.email;
    const initials = initialsFromNameOrEmail(labelSource);
    const showDashboardItem = !pathname.startsWith("/dashboard");

    useEffect(() => {
        if (!open) {
            return;
        }

        const onPointerDown = (event: PointerEvent): void => {
            if (wrapRef.current !== null && !wrapRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        const onKey = (event: KeyboardEvent): void => {
            if (event.key === "Escape") {
                setOpen(false);
                buttonRef.current?.focus();
            }
        };

        window.addEventListener("pointerdown", onPointerDown);
        window.addEventListener("keydown", onKey);

        return () => {
            window.removeEventListener("pointerdown", onPointerDown);
            window.removeEventListener("keydown", onKey);
        };
    }, [open]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setOpen(false);
    }, [pathname]);

    const goTo = (href: string): void => {
        setOpen(false);
        router.push(href);
    };

    return (
        <div className="account-menu-wrap" ref={wrapRef}>
            <button
                ref={buttonRef}
                type="button"
                className="account-avatar"
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={`Account menu for ${labelSource}`}
                onClick={() => setOpen((value) => !value)}
            >
                {user.avatarUrl !== null && user.avatarUrl !== "" ? (
                    <img
                        src={user.avatarUrl}
                        alt=""
                        className="account-avatar-image"
                        width={32}
                        height={32}
                        referrerPolicy="no-referrer"
                    />
                ) : (
                    <span className="account-avatar-initials" aria-hidden="true">
                        {initials}
                    </span>
                )}
            </button>

            {open ? (
                <div className="account-menu" role="menu">
                    <div className="account-menu-meta" role="presentation">
                        {user.displayName !== null && user.displayName !== "" ? (
                            <span className="account-menu-name">{user.displayName}</span>
                        ) : null}
                        <span className="account-menu-email">{user.email}</span>
                    </div>

                    <div className="account-menu-divider" />

                    <button
                        type="button"
                        className="account-menu-item"
                        role="menuitem"
                        onClick={() => goTo("/account")}
                    >
                        Account
                    </button>

                    {showDashboardItem ? (
                        <button
                            type="button"
                            className="account-menu-item"
                            role="menuitem"
                            onClick={() => goTo("/dashboard")}
                        >
                            Dashboard
                        </button>
                    ) : null}

                    <div className="account-menu-divider" />

                    <form action={signOut}>
                        <button type="submit" className="account-menu-item" role="menuitem">
                            Sign out
                        </button>
                    </form>
                </div>
            ) : null}
        </div>
    );
};
