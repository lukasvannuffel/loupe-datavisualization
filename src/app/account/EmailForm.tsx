"use client";

import { useActionState, useEffect, useRef } from "react";

import { useToast } from "@/lib/toast/useToast";

import { updateEmail, type FormActionState } from "./actions";

const INITIAL_STATE: FormActionState = {
    error: null,
    message: null,
    ok: false,
};

type EmailFormProps = {
    currentEmail: string;
};

export const EmailForm = ({ currentEmail }: EmailFormProps): JSX.Element => {
    const { toast } = useToast();
    const lastOkRef = useRef<boolean>(false);
    const [state, formAction, isPending] = useActionState<FormActionState, FormData>(
        updateEmail,
        INITIAL_STATE,
    );

    useEffect(() => {
        if (state.ok && state.message !== null && !lastOkRef.current) {
            toast({
                description: state.message,
                title: "Confirmation links sent.",
                variant: "info",
            });
        }

        lastOkRef.current = state.ok;
    }, [state.message, state.ok, toast]);

    return (
        <section className="profile-card">
            <header className="profile-card-head">
                <h2 className="profile-card-title">Email</h2>
                <p className="profile-card-sub">
                    Changing your email requires confirmation links sent to both your old and new
                    addresses.
                </p>
            </header>

            <form className="profile-grid" action={formAction}>
                <div className="field profile-grid-full">
                    <label htmlFor="account-current-email">Current email</label>
                    <input
                        id="account-current-email"
                        className="input"
                        type="email"
                        value={currentEmail}
                        readOnly
                        aria-readonly="true"
                    />
                </div>
                <div className="field profile-grid-full">
                    <label htmlFor="account-new-email">New email</label>
                    <input
                        id="account-new-email"
                        name="newEmail"
                        className="input"
                        type="email"
                        autoComplete="email"
                        placeholder="new@institution.edu"
                        required
                    />
                </div>

                {state.error !== null ? (
                    <p className="auth-error profile-grid-full" role="alert">
                        {state.error}
                    </p>
                ) : null}

                <div className="profile-grid-full">
                    <button
                        className="btn btn--primary btn--lg"
                        type="submit"
                        disabled={isPending}
                    >
                        {isPending ? "Sending links…" : "Send confirmation links"}
                    </button>
                </div>
            </form>
        </section>
    );
};
