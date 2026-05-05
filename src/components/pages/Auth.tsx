"use client";

import { useActionState, useState } from "react";

import { signIn, signUp, type AuthActionState } from "@/app/auth/actions";
import { Eyebrow } from "@/components/primitives/Eyebrow";

type AuthMode = "signin" | "signup";

const INITIAL_STATE: AuthActionState = {
    error: null,
    message: null,
};

export const Auth = (): JSX.Element => {
    const [mode, setMode] = useState<AuthMode>("signin");

    const action = mode === "signin" ? signIn : signUp;
    const [state, formAction, isPending] = useActionState<AuthActionState, FormData>(
        action,
        INITIAL_STATE,
    );

    return (
        <div className="auth-wrap page-enter">
            <div className="auth-card">
                <div className="auth-tabs">
                    <button
                        type="button"
                        className={"auth-tab" + (mode === "signin" ? " active" : "")}
                        onClick={() => setMode("signin")}
                    >
                        Sign in
                    </button>
                    <button
                        type="button"
                        className={"auth-tab" + (mode === "signup" ? " active" : "")}
                        onClick={() => setMode("signup")}
                    >
                        Create account
                    </button>
                </div>
                <Eyebrow>{mode === "signin" ? "Welcome back" : "Begin"}</Eyebrow>
                <h2 className="auth-title">
                    {mode === "signin" ? "Sign in to your workspace." : "Create a research workspace."}
                </h2>
                <p className="auth-sub">
                    {mode === "signin"
                        ? "Continue from where you left off."
                        : "Free for academic use. Email verification required."}
                </p>

                <form className="auth-fields" action={formAction}>
                    <div className="field">
                        <label htmlFor="auth-email">Email</label>
                        <input
                            id="auth-email"
                            name="email"
                            className="input"
                            type="email"
                            autoComplete="email"
                            placeholder="name@institution.edu"
                            required
                        />
                    </div>
                    <div className="field">
                        <label htmlFor="auth-password">Password</label>
                        <input
                            id="auth-password"
                            name="password"
                            className="input"
                            type="password"
                            autoComplete={mode === "signin" ? "current-password" : "new-password"}
                            placeholder="••••••••"
                            required
                            minLength={6}
                        />
                    </div>
                    {state.error !== null ? (
                        <p className="auth-error" role="alert">
                            {state.error}
                        </p>
                    ) : null}
                    {state.message !== null ? (
                        <p className="auth-info" role="status">
                            {state.message}
                        </p>
                    ) : null}
                    <button
                        className="btn btn--primary auth-submit"
                        type="submit"
                        disabled={isPending}
                    >
                        {isPending
                            ? mode === "signin"
                                ? "Signing in…"
                                : "Creating account…"
                            : mode === "signin"
                                ? "Sign in"
                                : "Create account"}
                    </button>
                </form>

                <div className="auth-divider">or</div>

                <button
                    type="button"
                    className="btn-google"
                    disabled
                    aria-disabled="true"
                    title="Google sign-in coming soon"
                >
                    <svg width="14" height="14" viewBox="0 0 14 14">
                        <circle cx="7" cy="7" r="6" fill="none" stroke="var(--ink)" strokeWidth="0.8" />
                        <path d="M7 4 V10 M4 7 H10" stroke="var(--ink)" strokeWidth="0.8" />
                    </svg>
                    Continue with Google
                </button>

                <div className="auth-privacy">
                    Your data never leaves your browser. Authentication exists only to save your projects and
                    finished charts.
                </div>
            </div>
        </div>
    );
};
