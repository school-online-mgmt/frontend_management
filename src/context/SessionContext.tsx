import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/api";

/**
 * Global academic-session selector.
 *
 * Pages used to each hold their own `selectedSessionId` state and render a
 * compact <SessionGate> in their PageHeader. Since the session is a tenant-
 * wide filter that applies to almost every page, we lift it to the Layout
 * and expose it via this context. Pages call `useSession()` to read the
 * chosen id and listen for changes via React's normal subscription model.
 *
 * Storage: the chosen id is mirrored to localStorage so it survives hard
 * refreshes. The session list is cached in React Query — switching pages
 * re-uses the cached array without an extra round trip.
 */

export interface SessionOption {
    id: string;
    name: string;
    slug: string;
    startDate: string;
    endDate: string;
    status?: string;
}

interface SessionContextValue {
    sessions: SessionOption[];
    selectedSessionId: string;
    setSelectedSessionId: (id: string) => void;
    selectedSession: SessionOption | undefined;
    loading: boolean;
    /** Force a re-fetch of the session list (used when sessions are created/edited). */
    reload: () => Promise<void>;
}

const STORAGE_KEY = "ep:selected-session";
export const SESSIONS_QUERY_KEY = ["sessions", "list"] as const;

const SessionContext = createContext<SessionContextValue | null>(null);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const queryClient = useQueryClient();

    // Sessions list — cached by React Query, shared across the app. We
    // normalise the response shape inside `select` so consumers always
    // get a clean array regardless of whether the API returned an array
    // or a `{ sessions: [...] }` envelope.
    const sessionsQuery = useQuery({
        queryKey: SESSIONS_QUERY_KEY,
        queryFn: () => api.getSessions(),
        staleTime: 5 * 60_000,
        select: (res: any): SessionOption[] =>
            Array.isArray(res?.sessions) ? res.sessions : Array.isArray(res) ? res : [],
    });
    const sessions = sessionsQuery.data ?? [];
    const loading  = sessionsQuery.isLoading;

    const [selectedSessionId, setSelectedSessionIdRaw] = useState<string>(() => {
        if (typeof window === "undefined") return "";
        return window.localStorage.getItem(STORAGE_KEY) ?? "";
    });
    const autoPickedRef = useRef(false);

    const setSelectedSessionId = useCallback((id: string) => {
        setSelectedSessionIdRaw(id);
        try {
            if (id) window.localStorage.setItem(STORAGE_KEY, id);
            else window.localStorage.removeItem(STORAGE_KEY);
        } catch { /* private mode etc. — ignore */ }
    }, []);

    // Auto-pick the ACTIVE session (or the first one) on first load if
    // nothing is persisted, or if the persisted id no longer exists in
    // the list. We only run this once per mount — never override a user
    // choice they made after the auto-pick fired.
    useEffect(() => {
        if (sessionsQuery.isLoading) return;
        if (autoPickedRef.current) return;
        autoPickedRef.current = true;
        const exists = selectedSessionId && sessions.some(s => s.id === selectedSessionId);
        if (!exists) {
            const active = sessions.find(s => s.status === "ACTIVE") ?? sessions[0];
            if (active) setSelectedSessionId(active.id);
        }
    }, [sessionsQuery.isLoading, sessions, selectedSessionId, setSelectedSessionId]);

    const reload = useCallback(async () => {
        await queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY });
    }, [queryClient]);

    const selectedSession = useMemo(
        () => sessions.find(s => s.id === selectedSessionId),
        [sessions, selectedSessionId],
    );

    const value = useMemo<SessionContextValue>(() => ({
        sessions,
        selectedSessionId,
        setSelectedSessionId,
        selectedSession,
        loading,
        reload,
    }), [sessions, selectedSessionId, setSelectedSessionId, selectedSession, loading, reload]);

    return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export function useSession(): SessionContextValue {
    const ctx = useContext(SessionContext);
    if (!ctx) {
        throw new Error("useSession must be used inside <SessionProvider>");
    }
    return ctx;
}

/**
 * Convenience hook for pages that only need the id and don't care about the
 * full session list. Returns "" when no session is selected — callers should
 * gate their fetches on that.
 */
export function useSessionId(): string {
    return useSession().selectedSessionId;
}
