"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/utils/supabase/server";

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
    const supabase = createClient(await cookies());
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error !== null) {
        return { error: error.message, message: null };
    }

    if (data.session === null) {
        // Supabase returns { user, session: null } in two distinct cases:
        // (a) confirmation email was just sent — `identities` is non-empty
        // (b) email already belongs to a confirmed account — `identities` is empty
        const identities = data.user?.identities ?? [];
        if (identities.length === 0) {
            return {
                error: "An account with this email already exists. Try signing in.",
                message: null,
            };
        }

        return {
            error: null,
            message: "Check your email to confirm your account.",
        };
    }

    revalidatePath("/", "layout");
    redirect("/dashboard");
};

export const authenticate = async (
    _prev: AuthActionState | null,
    formData: FormData,
): Promise<AuthActionState> => {
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
