"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { createClient } from "@/utils/supabase/server";

const MAX_LENGTH_SHORT = 80;
const MAX_LENGTH_LONG = 160;
const MIN_PASSWORD_LENGTH = 6;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REAUTH_NONCE_PATTERN = /^\d{6}$/;
const AVATAR_BUCKET = "avatars";
const AVATAR_MAX_BYTES = 4 * 1024 * 1024;
const AVATAR_ALLOWED_TYPES: ReadonlyArray<string> = [
    "image/png",
    "image/jpeg",
    "image/webp",
];

const extensionFromType = (type: string): string => {
    if (type === "image/png") {
        return "png";
    }
    if (type === "image/webp") {
        return "webp";
    }

    return "jpg";
};

export type FormActionState = {
    error: string | null;
    message: string | null;
    ok: boolean;
};

const INITIAL: FormActionState = {
    error: null,
    message: null,
    ok: false,
};

const fieldOrNull = (formData: FormData, key: string): string | null => {
    const trimmed = String(formData.get(key) ?? "").trim();

    return trimmed === "" ? null : trimmed;
};

const tooLong = (value: string | null, max: number): boolean => {
    return value !== null && value.length > max;
};

export const updateProfile = async (
    _prev: FormActionState | null,
    formData: FormData,
): Promise<FormActionState> => {
    const firstName = fieldOrNull(formData, "firstName");
    const lastName = fieldOrNull(formData, "lastName");
    const displayName = fieldOrNull(formData, "displayName");
    const institution = fieldOrNull(formData, "institution");
    const affiliation = fieldOrNull(formData, "affiliation");
    const role = fieldOrNull(formData, "role");
    const addressLine1 = fieldOrNull(formData, "addressLine1");
    const addressLine2 = fieldOrNull(formData, "addressLine2");
    const city = fieldOrNull(formData, "city");
    const postalCode = fieldOrNull(formData, "postalCode");
    const country = fieldOrNull(formData, "country");

    const shortFields: ReadonlyArray<string | null> = [
        firstName,
        lastName,
        displayName,
        affiliation,
        institution,
        role,
        city,
        postalCode,
        country,
    ];
    const longFields: ReadonlyArray<string | null> = [addressLine1, addressLine2];

    if (shortFields.some((value) => tooLong(value, MAX_LENGTH_SHORT))) {
        return { ...INITIAL, error: `Each field must be ${MAX_LENGTH_SHORT} characters or fewer.` };
    }
    if (longFields.some((value) => tooLong(value, MAX_LENGTH_LONG))) {
        return { ...INITIAL, error: `Address lines must be ${MAX_LENGTH_LONG} characters or fewer.` };
    }

    const supabase = createClient(await cookies());
    const { error } = await supabase.auth.updateUser({
        data: {
            first_name: firstName,
            last_name: lastName,
            display_name: displayName,
            institution,
            affiliation,
            role,
            address_line1: addressLine1,
            address_line2: addressLine2,
            city,
            postal_code: postalCode,
            country,
        },
    });

    if (error !== null) {
        return { ...INITIAL, error: error.message };
    }

    revalidatePath("/", "layout");

    return { error: null, message: "Profile saved.", ok: true };
};

type StorageClient = ReturnType<typeof createClient>;

const ownsPath = (path: string, userId: string): boolean => {
    return path === userId || path.startsWith(`${userId}/`);
};

const listExistingAvatarPaths = async (
    supabase: StorageClient,
    userId: string,
): Promise<ReadonlyArray<string>> => {
    const { data: files } = await supabase.storage.from(AVATAR_BUCKET).list(userId);
    if (files === null) {
        return [];
    }

    return files
        .map((entry: { name: string }): string => `${userId}/${entry.name}`)
        .filter((path: string): boolean => ownsPath(path, userId));
};

const removeAvatarFiles = async (
    supabase: StorageClient,
    userId: string,
    paths: ReadonlyArray<string>,
): Promise<void> => {
    const safePaths = paths.filter((path) => ownsPath(path, userId));
    if (safePaths.length === 0) {
        return;
    }

    await supabase.storage.from(AVATAR_BUCKET).remove([...safePaths]);
};

export const uploadAvatar = async (
    _prev: FormActionState | null,
    formData: FormData,
): Promise<FormActionState> => {
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
        return { ...INITIAL, error: "Pick an image to upload." };
    }
    if (file.size > AVATAR_MAX_BYTES) {
        return { ...INITIAL, error: "File must be 4 MB or smaller." };
    }
    if (!AVATAR_ALLOWED_TYPES.includes(file.type)) {
        return { ...INITIAL, error: "Use a PNG, JPG, or WebP image." };
    }

    const supabase = createClient(await cookies());
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (user === null) {
        return { ...INITIAL, error: "Not authenticated." };
    }

    const stalePaths = await listExistingAvatarPaths(supabase, user.id);

    const filename = `avatar-${Date.now()}-${crypto.randomUUID()}.${extensionFromType(file.type)}`;
    const path = `${user.id}/${filename}`;

    const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, file, { upsert: true, cacheControl: "3600", contentType: file.type });

    if (uploadError !== null) {
        return { ...INITIAL, error: uploadError.message };
    }

    await removeAvatarFiles(supabase, user.id, stalePaths);

    const { data: urlData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
    const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: urlData.publicUrl },
    });

    if (updateError !== null) {
        return { ...INITIAL, error: updateError.message };
    }

    revalidatePath("/", "layout");

    return { error: null, message: "Avatar updated.", ok: true };
};

export const removeAvatar = async (
    _prev: FormActionState | null,
    _formData: FormData,
): Promise<FormActionState> => {
    void _prev;
    void _formData;

    const supabase = createClient(await cookies());
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (user === null) {
        return { ...INITIAL, error: "Not authenticated." };
    }

    const existingPaths = await listExistingAvatarPaths(supabase, user.id);
    await removeAvatarFiles(supabase, user.id, existingPaths);

    const { error } = await supabase.auth.updateUser({
        data: { avatar_url: null },
    });

    if (error !== null) {
        return { ...INITIAL, error: error.message };
    }

    revalidatePath("/", "layout");

    return { error: null, message: "Avatar removed.", ok: true };
};

export const updateEmail = async (
    _prev: FormActionState | null,
    formData: FormData,
): Promise<FormActionState> => {
    const newEmail = fieldOrNull(formData, "newEmail");

    if (newEmail === null) {
        return { ...INITIAL, error: "Enter a new email address." };
    }
    if (!EMAIL_PATTERN.test(newEmail)) {
        return { ...INITIAL, error: "That doesn't look like a valid email." };
    }

    const supabase = createClient(await cookies());
    const { error } = await supabase.auth.updateUser({ email: newEmail });

    if (error !== null) {
        return { ...INITIAL, error: error.message };
    }

    return {
        error: null,
        message: "Confirmation links sent to both your old and new email. Click both to complete the change.",
        ok: true,
    };
};

export const requestPasswordChangeCode = async (
    _prev: FormActionState | null,
    _formData: FormData,
): Promise<FormActionState> => {
    void _prev;
    void _formData;

    const supabase = createClient(await cookies());
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (user === null) {
        return { ...INITIAL, error: "Not authenticated." };
    }

    const { error } = await supabase.auth.reauthenticate();

    if (error !== null) {
        return { ...INITIAL, error: error.message };
    }

    return {
        error: null,
        message: "We sent a 6-digit verification code to your email.",
        ok: true,
    };
};

export const updatePassword = async (
    _prev: FormActionState | null,
    formData: FormData,
): Promise<FormActionState> => {
    const nonce = String(formData.get("nonce") ?? "").trim();
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (nonce === "" || newPassword === "" || confirmPassword === "") {
        return { ...INITIAL, error: "All fields are required." };
    }
    if (!REAUTH_NONCE_PATTERN.test(nonce)) {
        return { ...INITIAL, error: "Verification code must be 6 digits." };
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
        return { ...INITIAL, error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
    }
    if (newPassword !== confirmPassword) {
        return { ...INITIAL, error: "New password and confirmation do not match." };
    }

    const supabase = createClient(await cookies());
    const { error } = await supabase.auth.updateUser({ password: newPassword, nonce });

    if (error !== null) {
        return { ...INITIAL, error: error.message };
    }

    return { error: null, message: "Password updated.", ok: true };
};
