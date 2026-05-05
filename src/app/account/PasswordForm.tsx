"use client";

import { useActionState, useRef, useEffect } from "react";

import { updatePassword, type FormActionState } from "./actions";

const INITIAL_STATE: FormActionState = {
    error: null,
    message: null,
    ok: false,
};

export const PasswordForm = (): JSX.Element => {
    const [state, formAction, isPending] = useActionState<FormActionState, FormData>(
        updatePassword,
        INITIAL_STATE,
    );

    const formRef = useRef<HTMLFormElement | null>(null);

    useEffect(() => {
        if (state.ok) {
            formRef.current?.reset();
        }
    }, [state.ok]);

    return (
        <section className="profile-card">
            <header className="profile-card-head">
                <h2 className="profile-card-title">Password</h2>
                <p className="profile-card-sub">
                    Confirm your current password before setting a new one.
                </p>
            </header>

            <form className="profile-grid" action={formAction} ref={formRef}>
                <div className="field profile-grid-full">
                    <label htmlFor="account-current-password">Current password</label>
                    <input
                        id="account-current-password"
                        name="currentPassword"
                        className="input"
                        type="password"
                        autoComplete="current-password"
                        required
                    />
                </div>
                <div className="field profile-grid-full">
                    <label htmlFor="account-new-password">New password</label>
                    <input
                        id="account-new-password"
                        name="newPassword"
                        className="input"
                        type="password"
                        autoComplete="new-password"
                        minLength={6}
                        required
                    />
                </div>
                <div className="field profile-grid-full">
                    <label htmlFor="account-confirm-password">Confirm new password</label>
                    <input
                        id="account-confirm-password"
                        name="confirmPassword"
                        className="input"
                        type="password"
                        autoComplete="new-password"
                        minLength={6}
                        required
                    />
                </div>

                {state.error !== null ? (
                    <p className="auth-error profile-grid-full" role="alert">
                        {state.error}
                    </p>
                ) : null}
                {state.ok && state.message !== null ? (
                    <p className="account-success profile-grid-full" role="status">
                        {state.message}
                    </p>
                ) : null}

                <div className="profile-grid-full">
                    <button
                        className="btn btn--primary btn--lg"
                        type="submit"
                        disabled={isPending}
                    >
                        {isPending ? "Updating…" : "Update password"}
                    </button>
                </div>
            </form>
        </section>
    );
};
