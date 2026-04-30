import React, { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import { useAuthContext } from './AuthContext';
import api from '../api/api';

// Kept for backward-compat but no longer populated — wizard replaces the checklist flow
export type OnboardingSteps = Awaited<ReturnType<typeof api.getOnboardingStatus>>['steps'];

interface OnboardingContextValue {
    isComplete: boolean | null;   // null = loading, false = wizard needed, true = portal open
    steps: OnboardingSteps | null;
    refetch: () => Promise<void>;
    /** Force-complete the onboarding gate (called after wizard submission) */
    forceComplete: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue>({
    isComplete: null,
    steps: null,
    refetch: async () => {},
    forceComplete: () => {},
});

/** Returns true if any session covers today's date */
function hasActiveSession(sessions: Array<{ startDate: string; endDate: string }>): boolean {
    const today = new Date();
    today.setHours(12, 0, 0, 0); // noon to avoid timezone edge cases
    return sessions.some(s => {
        const start = new Date(s.startDate);
        const end   = new Date(s.endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return today >= start && today <= end;
    });
}

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated } = useAuthContext();
    const [isComplete, setIsComplete] = useState<boolean | null>(null);
    const inProgressRef = useRef(false);

    const refetch = useCallback(async () => {
        if (inProgressRef.current) return;
        inProgressRef.current = true;
        try {
            const sessions = await api.getSessions();
            const active = Array.isArray(sessions) && hasActiveSession(sessions);
            setIsComplete(active);
        } catch {
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
            setIsComplete(null);
        }
    }, [isAuthenticated, refetch]);

    return (
        <OnboardingContext.Provider value={{ isComplete, steps: null, refetch, forceComplete }}>
            {children}
        </OnboardingContext.Provider>
    );
};

export const useOnboarding = () => useContext(OnboardingContext);
