"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/utils/supabase/server";

export type AuthActionState = {
    error: string | null;
    message: string | null;
};

const readCredentials = (formData: FormData): { email: string; password: string } => {
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    return { email, password };
};

export const signIn = async (
    _prev: AuthActionState | null,
    formData: FormData,
): Promise<AuthActionState> => {
    const { email, password } = readCredentials(formData);

    if (email === "" || password === "") {
        return { error: "Email and password are required.", message: null };
    }

    const supabase = createClient(await cookies());
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error !== null) {
        return { error: error.message, message: null };
    }

    revalidatePath("/", "layout");
    redirect("/dashboard");
};

export const signUp = async (
    _prev: AuthActionState | null,
    formData: FormData,
): Promise<AuthActionState> => {
    const { email, password } = readCredentials(formData);

    if (email === "" || password === "") {
        return { error: "Email and password are required.", message: null };
    }

    const supabase = createClient(await cookies());
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error !== null) {
        return { error: error.message, message: null };
    }

    if (data.session === null) {
        return {
            error: null,
            message: "Check your email to confirm your account.",
        };
    }

    revalidatePath("/", "layout");
    redirect("/dashboard");
};

export const signOut = async (): Promise<void> => {
    const supabase = createClient(await cookies());
    await supabase.auth.signOut();

    revalidatePath("/", "layout");
    redirect("/");
};
