"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

const MAX_LENGTH_SHORT = 80;
const MAX_LENGTH_LONG = 160;
const MIN_PASSWORD_LENGTH = 6;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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

type AdminClient = ReturnType<typeof createAdminClient>;

const listExistingAvatarPaths = async (
    admin: AdminClient,
    userId: string,
): Promise<ReadonlyArray<string>> => {
    const { data: files } = await admin.storage.from(AVATAR_BUCKET).list(userId);
    if (files === null) {
        return [];
    }

    return files.map((entry) => `${userId}/${entry.name}`);
};

const removeAvatarFiles = async (
    admin: AdminClient,
    paths: ReadonlyArray<string>,
): Promise<void> => {
    if (paths.length === 0) {
        return;
    }

    await admin.storage.from(AVATAR_BUCKET).remove([...paths]);
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

    // Storage operations go through the admin client because the SSR cookie-authed
    // client's JWT does not always reach the Storage service as `authenticated`.
    // Path is constrained to the verified user's folder, so privilege isn't widened.
    const admin = createAdminClient();
    const stalePaths = await listExistingAvatarPaths(admin, user.id);

    const path = `${user.id}/avatar-${Date.now()}.${extensionFromType(file.type)}`;
    const { error: uploadError } = await admin.storage
        .from(AVATAR_BUCKET)
        .upload(path, file, { upsert: true, cacheControl: "3600", contentType: file.type });

    if (uploadError !== null) {
        return { ...INITIAL, error: uploadError.message };
    }

    // Delete the previous files only after the new upload succeeded.
    await removeAvatarFiles(admin, stalePaths);

    const { data: urlData } = admin.storage.from(AVATAR_BUCKET).getPublicUrl(path);
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

    const admin = createAdminClient();
    const existingPaths = await listExistingAvatarPaths(admin, user.id);
    await removeAvatarFiles(admin, existingPaths);

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

export const updatePassword = async (
    _prev: FormActionState | null,
    formData: FormData,
): Promise<FormActionState> => {
    const currentPassword = String(formData.get("currentPassword") ?? "");
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (currentPassword === "" || newPassword === "" || confirmPassword === "") {
        return { ...INITIAL, error: "All password fields are required." };
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
        return { ...INITIAL, error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
    }
    if (newPassword !== confirmPassword) {
        return { ...INITIAL, error: "New password and confirmation do not match." };
    }
    if (newPassword === currentPassword) {
        return { ...INITIAL, error: "New password must differ from the current one." };
    }

    const supabase = createClient(await cookies());
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (user === null || user.email === undefined || user.email === "") {
        return { ...INITIAL, error: "Not authenticated." };
    }

    const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
    });

    if (verifyError !== null) {
        return { ...INITIAL, error: "Current password is incorrect." };
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

    if (updateError !== null) {
        return { ...INITIAL, error: updateError.message };
    }

    return { error: null, message: "Password updated.", ok: true };
};
