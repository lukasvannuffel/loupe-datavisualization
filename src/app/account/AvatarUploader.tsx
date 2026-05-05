"use client";

import { useActionState, useRef, type ChangeEvent } from "react";

import { initialsFromNameOrEmail } from "@/lib/profile";

import { removeAvatar, uploadAvatar, type FormActionState } from "./actions";

const ACCEPT = "image/png,image/jpeg,image/webp";

const INITIAL_STATE: FormActionState = {
    error: null,
    message: null,
    ok: false,
};

type AvatarUploaderProps = {
    avatarUrl: string | null;
    fallbackLabel: string;
};

export const AvatarUploader = ({
    avatarUrl,
    fallbackLabel,
}: AvatarUploaderProps): JSX.Element => {
    const [uploadState, uploadAction, isUploading] = useActionState<
        FormActionState,
        FormData
    >(uploadAvatar, INITIAL_STATE);
    const [removeState, removeAction, isRemoving] = useActionState<
        FormActionState,
        FormData
    >(removeAvatar, INITIAL_STATE);

    const uploadFormRef = useRef<HTMLFormElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const initials = initialsFromNameOrEmail(fallbackLabel);
    const isBusy = isUploading || isRemoving;
    const error = uploadState.error ?? removeState.error;

    const onPickFile = (event: ChangeEvent<HTMLInputElement>): void => {
        if (event.target.files !== null && event.target.files.length > 0) {
            uploadFormRef.current?.requestSubmit();
        }
    };

    const onClickPick = (): void => {
        fileInputRef.current?.click();
    };

    return (
        <div className="avatar-uploader">
            <div className="avatar-uploader-disc">
                {avatarUrl !== null ? (
                    <img
                        src={avatarUrl}
                        alt="Profile picture"
                        className="avatar-uploader-image"
                        width={96}
                        height={96}
                    />
                ) : (
                    <span className="avatar-uploader-initials">{initials}</span>
                )}
            </div>

            <div className="avatar-uploader-controls">
                <div className="avatar-uploader-actions">
                    <form
                        ref={uploadFormRef}
                        action={uploadAction}
                        encType="multipart/form-data"
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            name="file"
                            accept={ACCEPT}
                            className="avatar-uploader-input"
                            onChange={onPickFile}
                            aria-label="Upload profile picture"
                        />
                        <button
                            type="button"
                            className="avatar-uploader-button"
                            onClick={onClickPick}
                            disabled={isBusy}
                        >
                            <svg
                                width="14"
                                height="14"
                                viewBox="0 0 14 14"
                                aria-hidden="true"
                                focusable="false"
                            >
                                <path
                                    d="M7 9.5V2.5 M3.5 6 L7 2.5 L10.5 6"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.4"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                <path
                                    d="M2.5 11 H11.5"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.4"
                                    strokeLinecap="round"
                                />
                            </svg>
                            <span>
                                {isUploading
                                    ? "Uploading…"
                                    : avatarUrl !== null
                                        ? "Replace photo"
                                        : "Upload photo"}
                            </span>
                        </button>
                    </form>

                    {avatarUrl !== null ? (
                        <form action={removeAction}>
                            <button
                                type="submit"
                                className="avatar-uploader-remove"
                                disabled={isBusy}
                            >
                                {isRemoving ? "Removing…" : "Remove"}
                            </button>
                        </form>
                    ) : null}
                </div>

                <p className="avatar-uploader-hint">PNG, JPG, or WebP. Up to 4 MB.</p>

                {error !== null ? (
                    <p className="auth-error" role="alert">
                        {error}
                    </p>
                ) : null}
            </div>
        </div>
    );
};
