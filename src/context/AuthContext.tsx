import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api, { setLogoutCallback, setPasswordChangeRequiredCallback } from "../api/api";

/**
 * Since FR-014e the backend reports permissions as `resource:action` statements,
 * not as a module x level grid. `null` still means full access.
 */
export type ModulePermission = string;

/**
 * Which resources belong to which billable module, for menu gating only.
 *
 * The server never uses this — it authorises on statements. This exists purely
 * so the sidebar can decide whether to offer a section at all. Getting an entry
 * wrong hides or shows a menu item; it can never grant access, because every
 * route is checked server-side regardless.
 */
const MODULE_RESOURCES: Record<string, string[]> = {
    PEOPLE: ['student', 'applicant', 'entrance_exam', 'parent', 'document'],
    TEACHERS: ['teacher', 'staff_account', 'employment', 'salary', 'payroll', 'leave', 'appraisal', 'rbac'],
    ACADEMICS: ['session', 'class', 'section', 'subject', 'course', 'wing', 'department', 'promotion'],
    STUDIES: ['exam', 'marks', 'result', 'report_card'],
    ATTENDANCE: ['attendance', 'teacher_attendance'],
    LIBRARY: ['library_catalogue', 'library_circulation', 'library_fine'],
    COMMUNICATION: ['notice', 'broadcast', 'calendar', 'event', 'publication', 'grievance', 'ptm'],
    FINANCE: ['fee_structure', 'invoice', 'payment', 'fee_concession', 'platform_bill', 'finance_report'],
    TRANSPORT: ['transport'],
    SPORTS: ['sports', 'sports_profile', 'sports_lesson', 'sports_attendance', 'sports_incident'],
    INVENTORY: ['inventory'],
    HOMEWORK: ['homework'],
    TIMETABLE: ['timetable'],
    PANTRY: ['pantry'],
};

/** Actions that only read. Anything else counts as write for menu purposes. */
const READ_ACTIONS = new Set(['read', 'view', 'export', 'read-sensitive', 'board-returns', 'export-register']);

// ADMIN + PRINCIPAL have full write access. DIRECTOR is NO LONGER special-cased:
// since FR-014e it is an ordinary group, so its menu follows its statements like
// everyone else's. Showing it modules its group can't use would only produce
// 403s a click later.
export const FULL_ACCESS_ROLES = ['ADMIN', 'PRINCIPAL'] as const;
// Keep in sync with `PlatformModule` in backend src/Middlewares/requireModule.ts.
export const ALL_MODULES = [
  'PEOPLE', 'TEACHERS', 'ACADEMICS', 'STUDIES', 'ATTENDANCE', 'LIBRARY',
  'COMMUNICATION', 'FINANCE', 'TRANSPORT', 'SPORTS', 'INVENTORY', 'HOMEWORK',
  'TIMETABLE', 'PANTRY', 'FEEDBACK',
  // Gated 2026-08-04 (migrations 0125/0126) — capabilities that shipped ungated.
  'LEAVE', 'DOCUMENTS', 'PUBLICATIONS', 'GRIEVANCE', 'ENTRANCE_EXAM', 'COMPLIANCE',
  // Split out of a coarser parent 2026-08-04 (migrations 0127/0128).
  'HR_PAYROLL', 'STAFF_ATTENDANCE', 'ONLINE_PAYMENTS', 'REPORT_CARDS', 'ANALYTICS', 'BROADCAST',
] as const;
export type AppModule = typeof ALL_MODULES[number];

/**
 * PEOPLE, TEACHERS, and ACADEMICS are bundled into every school by default
 * and never appear in the optional add-on list — keep this in sync with the
 * `ALWAYS_ON` set in `src/Middlewares/requireModule.ts` and the seed in
 * migration 0053.
 */
const ALWAYS_ON_MODULES: ReadonlySet<AppModule> = new Set<AppModule>(['PEOPLE', 'TEACHERS', 'ACADEMICS']);

export interface User {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
    phone?: string;
    tenantId?: string;
    // Set when the account still holds a password someone else assigned. While
    // true the backend blocks every route but the change-password endpoints, and
    // the app shows the forced-change screen.
    mustChangePassword?: boolean;
    // null = full access (admin/principal/director), array = explicit grants, missing = loading
    permissions?: ModulePermission[] | null;
    /**
     * Per-tenant module subscriptions. The school's superadmin enables/disables
     * these from the SuperAdmin → Tenants → Modules tab. PEOPLE + TEACHERS are
     * always included regardless of DB state. Missing/null/undefined or a non-
     * array value is treated as "still loading / unknown" and the gate falls
     * open client-side (the backend's requireModule middleware is the real
     * authority).
     */
    enabledModules?: string[] | null;
}

interface AuthState {
    isAuthenticated: boolean | null;
    role: string | null;
    userId: string | null;
    user: User | null;
    /** While true, the app shows the forced password-change screen instead of routes. */
    mustChangePassword: boolean;
}

interface AuthContextValue extends AuthState {
    refresh: () => Promise<void>;
    logout: () => Promise<void>;
    /** Directly set auth from a login response without an extra checkAuth round-trip */
    loginDirect: (user: User) => void;
    /** Called after a successful forced password change — clears the gate and sends the user to log in again. */
    completePasswordChange: () => void;
    /** Returns true if the current user has at least READ access to the given module */
    hasModule: (module: AppModule) => boolean;
    /** Returns true if the current user has ADMIN access to the given module */
    hasModuleAdmin: (module: AppModule) => boolean;
    /** Returns true if the school (tenant) has the module subscription enabled */
    isModuleEnabled: (module: AppModule) => boolean;
    /**
     * Composite gate: the module is accessible iff the tenant has it enabled
     * AND the current user has at least READ permission. This is what callers
     * (sidebar, route guards) should generally use.
     */
    canUseModule: (module: AppModule) => boolean;
    /** True for ADMIN / PRINCIPAL / DIRECTOR */
    isFullAccess: boolean;
}

const AuthContext = createContext<AuthContextValue>({
    isAuthenticated: null,
    role: null,
    userId: null,
    user: null,
    mustChangePassword: false,
    refresh: async () => {},
    logout: async () => {},
    loginDirect: () => {},
    completePasswordChange: () => {},
    hasModule: () => true,
    hasModuleAdmin: () => true,
    isModuleEnabled: () => true,
    canUseModule: () => true,
    isFullAccess: true,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [auth, setAuth] = useState<AuthState>({
        isAuthenticated: null,
        role: null,
        userId: null,
        user: null,
        mustChangePassword: false,
    });
    const navigate = useNavigate();
    const verifyInProgressRef = useRef(false);
    // Set to true by loginDirect so the immediate background verify doesn't kick user out on failure
    const freshLoginRef = useRef(false);

    const verify = useCallback(async () => {
        // Prevent multiple concurrent verify calls
        if (verifyInProgressRef.current) {
            return;
        }

        verifyInProgressRef.current = true;
        try {
            const response = await api.checkAuth();
            const user = response?.user;
            freshLoginRef.current = false;
            setAuth({
                isAuthenticated: !!user?.id,
                role: user?.role ?? null,
                userId: user?.id ?? null,
                user: user ?? null,
                mustChangePassword: user?.mustChangePassword === true,
            });
        } catch (error: any) {
            if (freshLoginRef.current) {
                // First verify right after loginDirect — ignore failure (could be DB issue,
                // not an auth failure). The user just successfully logged in.
                freshLoginRef.current = false;
            } else {
                const status = error?.response?.status;
                // Only reset auth state on an explicit 401 (unauthenticated).
                // For server errors (5xx) or network failures, keep current state.
                if (status === 401 || !status) {
                    setAuth({ isAuthenticated: false, role: null, userId: null, user: null, mustChangePassword: false });
                }
            }
        } finally {
            verifyInProgressRef.current = false;
        }
    }, []);

    const logout = useCallback(async () => {
        try {
            await api.logout();
        } catch {
            // Logout API error is non-critical
        } finally {
            setAuth({
                isAuthenticated: false,
                role: null,
                userId: null,
                user: null,
                mustChangePassword: false,
            });
            navigate("/login", { replace: true });
        }
    }, [navigate]);

    // Set the logout callback for API interceptor
    useEffect(() => {
        setLogoutCallback(() => {
            setAuth({
                isAuthenticated: false,
                role: null,
                userId: null,
                user: null,
                mustChangePassword: false,
            });
            navigate("/login", { replace: true });
        });
    }, [navigate]);

    // Flip into the forced-change screen when any gated call reports the block.
    useEffect(() => {
        setPasswordChangeRequiredCallback(() => {
            setAuth(prev => (prev.mustChangePassword ? prev : { ...prev, mustChangePassword: true }));
        });
    }, []);

    // After a successful forced change the backend has revoked the session, so
    // clear local auth and send the user back to sign in with the new password.
    const completePasswordChange = useCallback(() => {
        setAuth({ isAuthenticated: false, role: null, userId: null, user: null, mustChangePassword: false });
        navigate("/login", { replace: true });
    }, [navigate]);

    // Verify auth on mount (without adding verify to dependency to avoid infinite loops)
    useEffect(() => {
        verify();
    }, []);

    // Periodically refresh auth token (only if authenticated)
    useEffect(() => {
        if (auth.isAuthenticated !== true) return;

        const interval = setInterval(() => {
            verify();
        }, 15 * 60 * 1000); // Every 15 minutes

        return () => clearInterval(interval);
    }, [auth.isAuthenticated, verify]);

    const loginDirect = useCallback((user: User) => {
        freshLoginRef.current = true;
        setAuth({
            isAuthenticated: true,
            role: user.role ?? null,
            userId: user.id,
            user,
            mustChangePassword: user.mustChangePassword === true,
        });
    }, []);

    const isFullAccess = FULL_ACCESS_ROLES.includes((auth.user?.role ?? '') as any);

    /** Does the user hold ANY statement over a resource in this module? */
    const hasModule = (module: AppModule): boolean => {
        if (isFullAccess) return true;                         // ADMIN, PRINCIPAL
        const perms = auth.user?.permissions;
        if (perms === null) return true;                       // server said full access
        if (!perms?.length) return false;
        const resources = MODULE_RESOURCES[module] ?? [];
        return perms.some(st => resources.includes(st.split(':')[0] ?? ''));
    };

    /** …and at least one of them that changes something? */
    const hasModuleAdmin = (module: AppModule): boolean => {
        if (isFullAccess) return true;                         // ADMIN, PRINCIPAL
        const perms = auth.user?.permissions;
        if (perms === null) return true;
        if (!perms?.length) return false;
        const resources = MODULE_RESOURCES[module] ?? [];
        return perms.some(st => {
            const [resource, action] = st.split(':');
            return resources.includes(resource ?? '') && !READ_ACTIONS.has(action ?? '');
        });
    };

    const isModuleEnabled = (module: AppModule): boolean => {
        if (ALWAYS_ON_MODULES.has(module)) return true;        // PEOPLE, TEACHERS — bundled defaults
        const enabled = auth.user?.enabledModules;
        // Until verifyAuth lands (or if the backend hasn't been updated to
        // return enabledModules), optimistically allow so the UI doesn't
        // flash an empty sidebar / redirect loop on first paint. Once we
        // see a real array we trust it.
        if (!Array.isArray(enabled)) return true;
        return enabled.includes(module);
    };

    const canUseModule = (module: AppModule): boolean => {
        try {
            return isModuleEnabled(module) && hasModule(module);
        } catch (err) {
            // Never let a gate-lookup throw take down the render tree.
            // Falling open is safe: the backend still enforces requireModule
            // on every privileged operation.
            // eslint-disable-next-line no-console
            console.warn('[AuthContext] canUseModule threw — falling open', module, err);
            return true;
        }
    };

    return (
        <AuthContext.Provider value={{ ...auth, refresh: verify, logout, loginDirect, completePasswordChange, hasModule, hasModuleAdmin, isModuleEnabled, canUseModule, isFullAccess }}>
            {children}
        </AuthContext.Provider>
    );
};


export const useAuthContext = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuthContext must be used within AuthProvider");
    }
    return context;
};


