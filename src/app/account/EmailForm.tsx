"use client";

import { useActionState } from "react";

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
    const [state, formAction, isPending] = useActionState<FormActionState, FormData>(
        updateEmail,
        INITIAL_STATE,
    );

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
                        {isPending ? "Sending links…" : "Send confirmation links"}
                    </button>
                </div>
            </form>
        </section>
    );
};
