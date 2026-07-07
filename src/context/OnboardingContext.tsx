import React, { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import { useAuthContext } from './AuthContext';
import api from '../api/api';

export type OnboardingStatus = Awaited<ReturnType<typeof api.getOnboardingStatus>>;

interface OnboardingContextValue {
    /** null while loading, then `isComplete` from the backend. */
    isComplete: boolean | null;
    /** Full status snapshot from the backend — session + per-step readiness. */
    status: OnboardingStatus | null;
    refetch: () => Promise<void>;
    /** Force the gate open (called after the wizard submits successfully). */
    forceComplete: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue>({
    isComplete: null,
    status: null,
    refetch: async () => {},
    forceComplete: () => {},
});

/**
 * The onboarding gate.
 *
 * The management portal isn't fully usable until the school has (a) defined
 * its identity (tenant_config.schoolName) and (b) set up class structure,
 * courses, subjects, and a fee structure for its currently active subscription
 * session. The wizard walks through those in order.
 *
 * Optional modules — transport, library, notice board — are also surfaced
 * inside `status.steps` for the wizard to show as "you can also…" tiles, but
 * they don't gate access.
 */
export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated } = useAuthContext();
    const [isComplete, setIsComplete] = useState<boolean | null>(null);
    const [status, setStatus] = useState<OnboardingStatus | null>(null);
    const inProgressRef = useRef(false);

    const refetch = useCallback(async () => {
        if (inProgressRef.current) return;
        inProgressRef.current = true;
        try {
            const s = await api.getOnboardingStatus();
            setStatus(s);
            setIsComplete(s.isComplete);
        } catch {
            // If the endpoint fails outright, treat as incomplete rather than
            // trapping the user in a blank shell — the wizard's own error
            // states surface actionable messages.
            setStatus(null);
            setIsComplete(false);
        } finally {
            inProgressRef.current = false;
        }
    }, []);

    const forceComplete = useCallback(() => {
        setIsComplete(true);
    }, []);

    useEffect(() => {
        if (isAuthenticated === true) {
            refetch();
        } else if (isAuthenticated === false) {
            setStatus(null);
            setIsComplete(null);
        }
    }, [isAuthenticated, refetch]);

    return (
        <OnboardingContext.Provider value={{ isComplete, status, refetch, forceComplete }}>
            {children}
        </OnboardingContext.Provider>
    );
};

export const useOnboarding = () => useContext(OnboardingContext);
