"use client";

import { useSearchParams } from "next/navigation";
import { useActionState, useState } from "react";

import { authenticate, type AuthActionState } from "@/app/auth/actions";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { MIN_NEW_PASSWORD_LENGTH } from "@/lib/auth";
import { createClient } from "@/utils/supabase/client";

type AuthMode = "signin" | "signup";

const INITIAL_STATE: AuthActionState = {
    error: null,
    message: null,
};

const resolveCallbackError = (errorParam: string | null): string | null => {
    if (errorParam === "oauth") {
        return "Google sign-in failed. Try again.";
    }
    if (errorParam === "callback") {
        return "That confirmation link is invalid or has expired.";
    }

    return null;
};

const submitLabel = (mode: AuthMode, isPending: boolean): string => {
    if (mode === "signin") {
        return isPending ? "Signing in…" : "Sign in";
    }

    return isPending ? "Creating account…" : "Create account";
};

export const Auth = (): JSX.Element => {
    const [mode, setMode] = useState<AuthMode>("signin");
    const [oauthError, setOauthError] = useState<string | null>(null);
    const [isOauthPending, setIsOauthPending] = useState<boolean>(false);

    const searchParams = useSearchParams();
    const callbackError = resolveCallbackError(searchParams?.get("error") ?? null);

    const [state, formAction, isPending] = useActionState<AuthActionState, FormData>(
        authenticate,
        INITIAL_STATE,
    );

    const onGoogleClick = async (): Promise<void> => {
        setOauthError(null);
        setIsOauthPending(true);

        const supabase = createClient();
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        if (error !== null) {
            setIsOauthPending(false);
            setOauthError("Couldn't start Google sign-in. Try again.");
        }
    };

    const inlineError = state.error ?? oauthError ?? callbackError;

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
                    {mode === "signin" ? "Sign in to your workspace." : "Create a workspace."}
                </h2>
                <p className="auth-sub">
                    {mode === "signin"
                        ? "Continue from where you left off."
                        : "Free for academic use. Email verification required."}
                </p>

                <form className="auth-fields" action={formAction}>
                    <input type="hidden" name="mode" value={mode} />

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
                            minLength={mode === "signup" ? MIN_NEW_PASSWORD_LENGTH : undefined}
                        />
                    </div>
                    {inlineError !== null ? (
                        <p className="auth-error" role="alert">
                            {inlineError}
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
                        {submitLabel(mode, isPending)}
                    </button>
                </form>

                <div className="auth-divider">or</div>

                <button
                    type="button"
                    className="btn-google"
                    onClick={onGoogleClick}
                    disabled={isOauthPending || isPending}
                >
                    <img src="/assets/google.svg" alt="" width={18} height={18} aria-hidden="true" />
                    {isOauthPending ? "Redirecting…" : "Continue with Google"}
                </button>

                <div className="auth-privacy">
                    Your data never leaves your browser. Authentication exists only to save your projects and
                    finished charts.
                </div>
            </div>
        </div>
    );
};
