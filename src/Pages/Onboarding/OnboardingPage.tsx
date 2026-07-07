import React from 'react';
import { useOnboarding } from '../../context/OnboardingContext';
import OnboardingWizard from './OnboardingWizard';

/**
 * Legacy `/onboarding` route. Historically this rendered a step-by-step
 * checklist that linked out to individual module pages. That flow is now
 * subsumed by <OnboardingWizard/> which does everything in one flow. This
 * page just delegates to the wizard so any deep-link to `/onboarding`
 * still lands the operator in the right place.
 */
const OnboardingPage: React.FC = () => {
    // Force the wizard even if the user's setup already looks complete — they
    // clearly deep-linked here for a reason (e.g. to re-run parts of setup).
    // The wizard itself surfaces "already done" flags per step.
    useOnboarding();
    return <OnboardingWizard />;
};

export default OnboardingPage;
