import React from 'react';
import { Outlet } from 'react-router-dom';
import { useOnboarding } from '../context/OnboardingContext';
import OnboardingWizard from '../Pages/Onboarding/OnboardingWizard';

const OnboardingGate: React.FC = () => {
    const { isComplete } = useOnboarding();

    if (isComplete === null) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-slate-500">Loading portal…</p>
                </div>
            </div>
        );
    }

    // No active session today → show the full-screen setup wizard.
    // The wizard cannot be exited; it calls forceComplete() after submission.
    if (!isComplete) return <OnboardingWizard />;

    return <Outlet />;
};

export default OnboardingGate;
