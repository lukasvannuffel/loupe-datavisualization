"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { MIN_NEW_PASSWORD_LENGTH } from "@/lib/auth";
import { SITE_URL } from "@/lib/env";
import { verifyHuman } from "@/utils/bot-guard";
import { createClient } from "@/utils/supabase/server";

const GENERIC_SIGNUP_MESSAGE =
    "If your email isn't already registered, we've sent a confirmation link.";

export type AuthActionState = {
    error: string | null;
    message: string | null;
};

type AuthMode = "signin" | "signup";

const readMode = (formData: FormData): AuthMode => {
    return String(formData.get("mode") ?? "signin") === "signup" ? "signup" : "signin";
};

const readCredentials = (formData: FormData): { email: string; password: string } => {
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    return { email, password };
};

const performSignIn = async (
    email: string,
    password: string,
): Promise<AuthActionState> => {
    const supabase = createClient(await cookies());
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error !== null) {
        return { error: error.message, message: null };
    }

    revalidatePath("/", "layout");
    redirect("/dashboard");
};

const performSignUp = async (
    email: string,
    password: string,
): Promise<AuthActionState> => {
    if (password.length < MIN_NEW_PASSWORD_LENGTH) {
        return {
            error: `Password must be at least ${MIN_NEW_PASSWORD_LENGTH} characters.`,
            message: null,
        };
    }

    const supabase = createClient(await cookies());
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: SITE_URL === null ? undefined : `${SITE_URL}/auth/callback`,
        },
    });

    if (error !== null) {
        // Collapse every signup error (already-registered, password policy,
        // rate-limit, network) into the same generic message — prevents
        // email enumeration via distinguishable error text.
        return { error: null, message: GENERIC_SIGNUP_MESSAGE };
    }

    if (data.session === null) {
        return { error: null, message: GENERIC_SIGNUP_MESSAGE };
    }

    revalidatePath("/", "layout");
    redirect("/dashboard");
};

export const authenticate = async (
    _prev: AuthActionState | null,
    formData: FormData,
): Promise<AuthActionState> => {
    const guard = await verifyHuman();
    if (!guard.ok) {
        return { error: guard.error, message: null };
    }

    const mode = readMode(formData);
    const { email, password } = readCredentials(formData);

    if (email === "" || password === "") {
        return { error: "Email and password are required.", message: null };
    }

    if (mode === "signup") {
        return performSignUp(email, password);
    }

    return performSignIn(email, password);
};

export const signOut = async (): Promise<void> => {
    const supabase = createClient(await cookies());
    await supabase.auth.signOut();

    revalidatePath("/", "layout");
    redirect("/");
};
