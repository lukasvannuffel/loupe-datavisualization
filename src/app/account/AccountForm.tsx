"use client";

import { useActionState, useEffect, useRef } from "react";

import type { Profile } from "@/lib/profile";
import { useToast } from "@/lib/toast/useToast";

import { updateProfile, type FormActionState } from "./actions";

const INITIAL_STATE: FormActionState = {
    error: null,
    message: null,
    ok: false,
};

const ROLE_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
    { value: "", label: "Select a role…" },
    { value: "Researcher", label: "Researcher" },
    { value: "Clinician", label: "Clinician" },
    { value: "Resident", label: "Resident" },
    { value: "Postdoc", label: "Postdoc" },
    { value: "PhD candidate", label: "PhD candidate" },
    { value: "Student", label: "Student" },
    { value: "Faculty", label: "Faculty" },
    { value: "Other", label: "Other" },
];

type AccountFormProps = {
    profile: Profile;
};

export const AccountForm = ({ profile }: AccountFormProps): JSX.Element => {
    const { toast } = useToast();
    const lastOkRef = useRef<boolean>(false);
    const [state, formAction, isPending] = useActionState<FormActionState, FormData>(
        updateProfile,
        INITIAL_STATE,
    );

    useEffect(() => {
        if (state.ok && state.message !== null && !lastOkRef.current) {
            toast({
                description: state.message,
                title: "Profile updated.",
                variant: "success",
            });
        }

        lastOkRef.current = state.ok;
    }, [state.message, state.ok, toast]);

    return (
        <form className="profile-form" action={formAction}>
            <section className="profile-card">
                <header className="profile-card-head">
                    <h2 className="profile-card-title">Identity</h2>
                    <p className="profile-card-sub">How you appear across the workspace.</p>
                </header>

                <div className="profile-grid">
                    <div className="field">
                        <label htmlFor="account-first-name">First name</label>
                        <input
                            id="account-first-name"
                            name="firstName"
                            className="input"
                            type="text"
                            autoComplete="given-name"
                            placeholder="Maaike"
                            defaultValue={profile.firstName ?? ""}
                            maxLength={80}
                        />
                    </div>
                    <div className="field">
                        <label htmlFor="account-last-name">Last name</label>
                        <input
                            id="account-last-name"
                            name="lastName"
                            className="input"
                            type="text"
                            autoComplete="family-name"
                            placeholder="Visser"
                            defaultValue={profile.lastName ?? ""}
                            maxLength={80}
                        />
                    </div>
                    <div className="field profile-grid-full">
                        <label htmlFor="account-display-name">
                            Display name
                            <span className="field-hint"> · optional</span>
                        </label>
                        <input
                            id="account-display-name"
                            name="displayName"
                            className="input"
                            type="text"
                            autoComplete="nickname"
                            placeholder="Defaults to first + last name"
                            defaultValue={profile.displayName ?? ""}
                            maxLength={80}
                        />
                    </div>
                </div>
            </section>

            <section className="profile-card">
                <header className="profile-card-head">
                    <h2 className="profile-card-title">Professional</h2>
                    <p className="profile-card-sub">Used in greetings and figure attribution.</p>
                </header>

                <div className="profile-grid">
                    <div className="field profile-grid-full">
                        <label htmlFor="account-institution">Institution</label>
                        <input
                            id="account-institution"
                            name="institution"
                            className="input"
                            type="text"
                            autoComplete="organization"
                            placeholder="Erasmus MC"
                            defaultValue={profile.institution ?? ""}
                            maxLength={80}
                        />
                    </div>
                    <div className="field profile-grid-full">
                        <label htmlFor="account-affiliation">Department</label>
                        <input
                            id="account-affiliation"
                            name="affiliation"
                            className="input"
                            type="text"
                            placeholder="Department of Surgical Oncology"
                            defaultValue={profile.affiliation ?? ""}
                            maxLength={80}
                        />
                    </div>
                    <div className="field profile-grid-full">
                        <label htmlFor="account-role">Role</label>
                        <select
                            id="account-role"
                            name="role"
                            className="input"
                            defaultValue={profile.role ?? ""}
                        >
                            {ROLE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </section>

            <section className="profile-card">
                <header className="profile-card-head">
                    <h2 className="profile-card-title">Address</h2>
                    <p className="profile-card-sub">Optional. Used on exported figure metadata when enabled.</p>
                </header>

                <div className="profile-grid">
                    <div className="field profile-grid-full">
                        <label htmlFor="account-address-line1">Street address</label>
                        <input
                            id="account-address-line1"
                            name="addressLine1"
                            className="input"
                            type="text"
                            autoComplete="address-line1"
                            placeholder="Dr. Molewaterplein 40"
                            defaultValue={profile.address.line1 ?? ""}
                            maxLength={160}
                        />
                    </div>
                    <div className="field profile-grid-full">
                        <label htmlFor="account-address-line2">
                            Address line 2
                            <span className="field-hint"> · optional</span>
                        </label>
                        <input
                            id="account-address-line2"
                            name="addressLine2"
                            className="input"
                            type="text"
                            autoComplete="address-line2"
                            placeholder="Apt, suite, building"
                            defaultValue={profile.address.line2 ?? ""}
                            maxLength={160}
                        />
                    </div>
                    <div className="field">
                        <label htmlFor="account-city">City</label>
                        <input
                            id="account-city"
                            name="city"
                            className="input"
                            type="text"
                            autoComplete="address-level2"
                            placeholder="Rotterdam"
                            defaultValue={profile.address.city ?? ""}
                            maxLength={80}
                        />
                    </div>
                    <div className="field">
                        <label htmlFor="account-postal-code">Postal code</label>
                        <input
                            id="account-postal-code"
                            name="postalCode"
                            className="input"
                            type="text"
                            autoComplete="postal-code"
                            placeholder="3015 GD"
                            defaultValue={profile.address.postalCode ?? ""}
                            maxLength={80}
                        />
                    </div>
                    <div className="field profile-grid-full">
                        <label htmlFor="account-country">Country</label>
                        <input
                            id="account-country"
                            name="country"
                            className="input"
                            type="text"
                            autoComplete="country-name"
                            placeholder="Netherlands"
                            defaultValue={profile.address.country ?? ""}
                            maxLength={80}
                        />
                    </div>
                </div>
            </section>

            <div className="profile-form-footer">
                <button
                    className="btn btn--primary btn--lg profile-save"
                    type="submit"
                    disabled={isPending}
                >
                    {isPending ? "Saving…" : "Save changes"}
                </button>
                {state.error !== null ? (
                    <p className="auth-error profile-form-message" role="alert">
                        {state.error}
                    </p>
                ) : null}
            </div>
        </form>
    );
};
