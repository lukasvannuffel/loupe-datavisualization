"use client";

import { useSearchParams } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";

import { authenticate, type AuthActionState } from "@/app/auth/actions";
import { Eyebrow } from "@/components/primitives/Eyebrow";
import { MIN_NEW_PASSWORD_LENGTH } from "@/lib/auth";
import { useToast } from "@/lib/toast/useToast";
import { createClient } from "@/utils/supabase/client";

type AuthMode = "signin" | "signup";

const INITIAL_STATE: AuthActionState = {
    error: null,
    message: null,
};

const resolveCallbackError = (errorParam: string | null): { readonly description: string; readonly title: string } | null => {
    if (errorParam === "oauth") {
        return {
            description: "Try Google sign-in again or use email and password.",
            title: "Google sign-in did not complete.",
        };
    }
    if (errorParam === "callback") {
        return {
            description: "Request a fresh confirmation link and try again.",
            title: "That confirmation link is invalid or expired.",
        };
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
    const { toast } = useToast();
    const [mode, setMode] = useState<AuthMode>("signin");
    const [isOauthPending, setIsOauthPending] = useState<boolean>(false);
    const callbackNotifiedRef = useRef<boolean>(false);

    const searchParams = useSearchParams();
    const callbackError = resolveCallbackError(searchParams?.get("error") ?? null);

    const [state, formAction, isPending] = useActionState<AuthActionState, FormData>(
        authenticate,
        INITIAL_STATE,
    );

    useEffect(() => {
        if (callbackError === null || callbackNotifiedRef.current) {
            return;
        }

        callbackNotifiedRef.current = true;
        toast({
            description: callbackError.description,
            durationMs: 0,
            title: callbackError.title,
            variant: "error",
        });
    }, [callbackError, toast]);

    useEffect(() => {
        if (state.message === null) {
            return;
        }

        toast({
            description: state.message,
            title: "Check your inbox.",
            variant: "info",
        });
    }, [state.message, toast]);

    const onGoogleClick = async (): Promise<void> => {
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
            toast({
                description: "Try again in a moment.",
                title: "Could not start Google sign-in.",
                variant: "error",
            });
        }
    };

    const inlineError = state.error;

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
                    onClick={() => {
                        void onGoogleClick();
                    }}
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
