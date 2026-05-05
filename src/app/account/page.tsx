import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { Eyebrow } from "@/components/primitives/Eyebrow";
import { displayNameFromUser, profileFromUser } from "@/lib/profile";
import { createClient } from "@/utils/supabase/server";

import { AccountForm } from "./AccountForm";
import { AvatarUploader } from "./AvatarUploader";
import { EmailForm } from "./EmailForm";
import { PasswordForm } from "./PasswordForm";

const AccountPage = async (): Promise<JSX.Element> => {
    const supabase = createClient(await cookies());
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (user === null) {
        redirect("/auth");
    }

    const profile = profileFromUser(user);
    const email = user.email ?? "";
    const fallbackLabel = displayNameFromUser(user);

    return (
        <div className="page-enter">
            <div className="container container--narrow">
                <header className="account-header">
                    <Eyebrow>Account</Eyebrow>
                    <h1 className="account-title">Personal information.</h1>
                    <p className="account-sub">
                        Manage your profile, professional details, and account credentials.
                    </p>
                </header>

                <section className="profile-card">
                    <header className="profile-card-head">
                        <h2 className="profile-card-title">Profile picture</h2>
                        <p className="profile-card-sub">
                            Shown next to your name in the workspace and on exported figures.
                        </p>
                    </header>
                    <AvatarUploader
                        avatarUrl={profile.avatarUrl}
                        fallbackLabel={fallbackLabel}
                    />
                </section>

                <AccountForm profile={profile} />

                <EmailForm currentEmail={email} />

                <PasswordForm />
            </div>
        </div>
    );
};

export default AccountPage;
