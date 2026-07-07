import React from 'react';
import { Outlet } from 'react-router-dom';
import { Loader2, School } from 'lucide-react';
import { useOnboarding } from '../context/OnboardingContext';
import OnboardingWizard from '../Pages/Onboarding/OnboardingWizard';

/**
 * The onboarding gate. Runs on every management route.
 *
 * States:
 *   `isComplete === null`  — loading; brief splash so we don't flash the
 *                            wizard for users who are actually set up.
 *   `isComplete === true`  — regular portal via <Outlet />.
 *   `isComplete === false` — the first-time setup wizard blocks the shell.
 *
 * We deliberately don't short-circuit to `<Outlet />` when loading fails —
 * the wizard's own empty state handles "no session subscribed" with a
 * pointer at the platform admin.
 */
const OnboardingGate: React.FC = () => {
    const { isComplete } = useOnboarding();

    if (isComplete === null) {
        return (
            <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-50">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center mb-4">
                    <School size={22} className="text-emerald-600" />
                </div>
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <Loader2 size={14} className="animate-spin" />
                    <span>Checking your school setup…</span>
                </div>
            </div>
        );
    }

    if (isComplete === false) {
        return <OnboardingWizard />;
    }

    return <Outlet />;
};

export default OnboardingGate;
