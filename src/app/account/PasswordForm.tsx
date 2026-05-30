"use client";

import { useActionState, useEffect, useRef } from "react";

import { MIN_NEW_PASSWORD_LENGTH } from "@/lib/auth";
import { useToast } from "@/lib/toast/useToast";

import {
    requestPasswordChangeCode,
    updatePassword,
    type FormActionState,
} from "./actions";

const INITIAL_STATE: FormActionState = {
    error: null,
    message: null,
    ok: false,
};

export const PasswordForm = (): JSX.Element => {
    const { toast } = useToast();
    const lastRequestOkRef = useRef<boolean>(false);
    const lastUpdateOkRef = useRef<boolean>(false);
    const [requestState, requestAction, isRequesting] = useActionState<
        FormActionState,
        FormData
    >(requestPasswordChangeCode, INITIAL_STATE);
    const [updateState, updateAction, isUpdating] = useActionState<
        FormActionState,
        FormData
    >(updatePassword, INITIAL_STATE);

    const updateFormRef = useRef<HTMLFormElement | null>(null);

    useEffect(() => {
        if (updateState.ok) {
            updateFormRef.current?.reset();
        }
    }, [updateState.ok]);

    useEffect(() => {
        if (requestState.ok && requestState.message !== null && !lastRequestOkRef.current) {
            toast({
                description: requestState.message,
                title: "Verification code sent.",
                variant: "info",
            });
        }

        lastRequestOkRef.current = requestState.ok;
    }, [requestState.message, requestState.ok, toast]);

    useEffect(() => {
        if (updateState.ok && updateState.message !== null && !lastUpdateOkRef.current) {
            toast({
                description: updateState.message,
                title: "Password updated.",
                variant: "success",
            });
        }

        lastUpdateOkRef.current = updateState.ok;
    }, [updateState.message, updateState.ok, toast]);

    const codeSent = requestState.ok;
    const error = updateState.error ?? requestState.error;

    return (
        <section className="profile-card">
            <header className="profile-card-head">
                <h2 className="profile-card-title">Password</h2>
                <p className="profile-card-sub">
                    We'll email you a 6-digit code to confirm it's you before changing your password.
                </p>
            </header>

            <form className="profile-grid" action={requestAction}>
                <div className="profile-grid-full">
                    <button
                        className="btn btn--ghost btn--lg"
                        type="submit"
                        disabled={isRequesting || isUpdating}
                    >
                        {isRequesting
                            ? "Sending…"
                            : codeSent
                                ? "Resend verification code"
                                : "Send verification code"}
                    </button>
                </div>
            </form>

            <form className="profile-grid" action={updateAction} ref={updateFormRef}>
                <div className="field profile-grid-full">
                    <label htmlFor="account-reauth-nonce">Verification code</label>
                    <input
                        id="account-reauth-nonce"
                        name="nonce"
                        className="input"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        pattern="\d{6}"
                        maxLength={6}
                        placeholder="123456"
                        disabled={!codeSent}
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
                        minLength={MIN_NEW_PASSWORD_LENGTH}
                        disabled={!codeSent}
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
                        disabled={!codeSent}
                        required
                    />
                </div>

                {error !== null ? (
                    <p className="auth-error profile-grid-full" role="alert">
                        {error}
                    </p>
                ) : null}

                <div className="profile-grid-full">
                    <button
                        className="btn btn--primary btn--lg"
                        type="submit"
                        disabled={!codeSent || isUpdating || isRequesting}
                    >
                        {isUpdating ? "Updating…" : "Update password"}
                    </button>
                </div>
            </form>
        </section>
    );
};
