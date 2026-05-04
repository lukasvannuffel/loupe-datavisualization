"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Eyebrow } from "@/components/primitives/Eyebrow";
import { useAppState } from "@/app/providers";

type AuthMode = "signin" | "signup";

export const Auth = (): JSX.Element => {
    const router = useRouter();
    const { setAuthed } = useAppState();

    const [mode, setMode] = useState<AuthMode>("signin");
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");

    const submit = (e: FormEvent<HTMLFormElement>): void => {
        e.preventDefault();
        setAuthed(true);
        router.push("/dashboard");
    };

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

                <form className="auth-fields" onSubmit={submit}>
                    <div className="field">
                        <label>Email</label>
                        <input
                            className="input"
                            type="email"
                            placeholder="name@institution.edu"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="field">
                        <label>Password</label>
                        <input
                            className="input"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <button className="btn btn--primary auth-submit" type="submit">
                        {mode === "signin" ? "Sign in" : "Create account"}
                    </button>
                </form>

                <div className="auth-divider">or</div>

                <button type="button" className="btn-google">
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
