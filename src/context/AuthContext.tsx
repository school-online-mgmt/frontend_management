import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api, { setLogoutCallback } from "../api/api";

interface User {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
    phone?: string;
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
}

const AuthContext = createContext<AuthContextValue>({
    isAuthenticated: null,
    role: null,
    userId: null,
    user: null,
    refresh: async () => {},
    logout: async () => {},
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

    const verify = useCallback(async () => {
        // Prevent multiple concurrent verify calls
        if (verifyInProgressRef.current) {
            return;
        }

        verifyInProgressRef.current = true;
        try {
            const response = await api.checkAuth();
            const user = response?.user;

            setAuth({
                isAuthenticated: !!user?.id,
                role: user?.role ?? null,
                userId: user?.id ?? null,
                user: user ?? null,
            });
        } catch (error) {
            setAuth({ 
                isAuthenticated: false, 
                role: null, 
                userId: null,
                user: null 
            });
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

    return (
        <AuthContext.Provider value={{ ...auth, refresh: verify, logout }}>
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


