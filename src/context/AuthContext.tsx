import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api, { setLogoutCallback } from "../api/api";

export type ModulePermission = { module: string; level: 'READ' | 'ADMIN' };

// ADMIN + PRINCIPAL have full write access; DIRECTOR has read-only to all modules
export const FULL_ACCESS_ROLES = ['ADMIN', 'PRINCIPAL'] as const;
export const ALL_MODULES = ['PEOPLE', 'TEACHERS', 'ACADEMICS', 'STUDIES', 'ATTENDANCE', 'LIBRARY', 'COMMUNICATION', 'FINANCE', 'TRANSPORT', 'SPORTS', 'INVENTORY', 'HOMEWORK', 'TIMETABLE'] as const;
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
}

interface AuthContextValue extends AuthState {
    refresh: () => Promise<void>;
    logout: () => Promise<void>;
    /** Directly set auth from a login response without an extra checkAuth round-trip */
    loginDirect: (user: User) => void;
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
    refresh: async () => {},
    logout: async () => {},
    loginDirect: () => {},
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
                    setAuth({ isAuthenticated: false, role: null, userId: null, user: null });
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
                user: null 
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
                user: null 
            });
            navigate("/login", { replace: true });
        });
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
        });
    }, []);

    const isFullAccess = FULL_ACCESS_ROLES.includes((auth.user?.role ?? '') as any);

    const hasModule = (module: AppModule): boolean => {
        if (isFullAccess) return true;                         // ADMIN, PRINCIPAL
        if (auth.user?.role === 'DIRECTOR') return true;      // Director has read access to all modules
        const perms = auth.user?.permissions;
        if (perms === null) return true;
        if (!perms) return false;
        return perms.some(p => p.module === module);
    };

    const hasModuleAdmin = (module: AppModule): boolean => {
        if (isFullAccess) return true;                         // ADMIN, PRINCIPAL
        if (auth.user?.role === 'DIRECTOR') return false;     // Director is read-only
        const perms = auth.user?.permissions;
        if (perms === null) return true;
        if (!perms) return false;
        return perms.some(p => p.module === module && p.level === 'ADMIN');
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
        <AuthContext.Provider value={{ ...auth, refresh: verify, logout, loginDirect, hasModule, hasModuleAdmin, isModuleEnabled, canUseModule, isFullAccess }}>
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


