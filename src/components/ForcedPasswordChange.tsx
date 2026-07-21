import React, { useState } from "react";
import { KeyRound, Loader2, ShieldCheck, Eye, EyeOff } from "lucide-react";
import api from "../api/api";
import { useAuthContext } from "../context/AuthContext";

/**
 * Full-screen gate shown when the account still holds a password someone else
 * assigned. The backend blocks every other route until the change is made, so
 * this is the only thing the user can do — there is deliberately no way past it
 * except changing the password or logging out.
 *
 * On success the backend has already revoked the session, so we hand control to
 * `completePasswordChange`, which returns the user to the login screen to sign
 * in with their new password.
 */
const ForcedPasswordChange: React.FC = () => {
    const { user, logout, completePasswordChange } = useAuthContext();
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [show, setShow] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (newPassword.length < 8) { setError("Your new password must be at least 8 characters."); return; }
        if (newPassword !== confirmPassword) { setError("The two new passwords don't match."); return; }
        if (newPassword === currentPassword) { setError("Choose a password different from your current one."); return; }

        setBusy(true);
        try {
            await api.changeOwnPassword(currentPassword, newPassword);
            setDone(true);
            // Brief confirmation, then back to login on the new password.
            setTimeout(() => completePasswordChange(), 1400);
        } catch (err: any) {
            setError(err?.response?.data?.message ?? "Couldn't change your password. Please try again.");
            setBusy(false);
        }
    };

    return (
        <div data-testid="forced-password-change" className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-7">
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mb-3">
                        <ShieldCheck className="text-amber-600" size={22} />
                    </div>
                    <h1 className="text-lg font-bold text-slate-800">Set your own password</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        {user?.firstName ? `Hi ${user.firstName}, your ` : "Your "}
                        account was created with a temporary password. Choose a new one to continue.
                    </p>
                </div>

                {done ? (
                    <div data-testid="forced-password-change-success" className="text-center py-6">
                        <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-3">
                            <ShieldCheck className="text-emerald-600" size={22} />
                        </div>
                        <p className="text-sm font-medium text-slate-700">Password changed.</p>
                        <p className="text-xs text-slate-500 mt-1">Taking you to sign in with your new password…</p>
                    </div>
                ) : (
                    <form onSubmit={submit} className="space-y-3">
                        {error && (
                            <div data-testid="forced-password-change-error" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Current (temporary) password</label>
                            <input
                                data-testid="forced-current-password-input"
                                type={show ? "text" : "password"}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                autoFocus
                                className="w-full border border-slate-200 bg-slate-50 text-sm px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">New password</label>
                            <div className="relative">
                                <input
                                    data-testid="forced-new-password-input"
                                    type={show ? "text" : "password"}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="At least 8 characters"
                                    className="w-full border border-slate-200 bg-slate-50 text-sm px-3 py-2.5 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                                <button type="button" onClick={() => setShow((v) => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                    {show ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Confirm new password</label>
                            <input
                                data-testid="forced-confirm-password-input"
                                type={show ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full border border-slate-200 bg-slate-50 text-sm px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>

                        <button
                            data-testid="forced-password-change-submit"
                            type="submit"
                            disabled={busy}
                            className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-emerald-700 disabled:opacity-60 mt-1"
                        >
                            {busy ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                            Change password &amp; continue
                        </button>

                        <button
                            data-testid="forced-password-change-logout"
                            type="button"
                            onClick={logout}
                            className="w-full text-xs text-slate-400 hover:text-slate-600 pt-1"
                        >
                            Sign out instead
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ForcedPasswordChange;
