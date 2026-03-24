import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../api/api";

interface AuthState {
    isAuthenticated: boolean | null;
    role: string | null;
    userId: string | null;
}

interface AuthContextValue extends AuthState {
    refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
    isAuthenticated: null,
    role: null,
    userId: null,
    refresh: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [auth, setAuth] = useState<AuthState>({
        isAuthenticated: null,
        role: null,
        userId: null,
    });

    const verify = async () => {
        try {
            const response = await api.checkAuth();
            const user = response?.user;
            setAuth({
                isAuthenticated: !!user?.id,
                role: user?.role ?? null,
                userId: user?.id ?? null,
            });
        } catch {
            setAuth({ isAuthenticated: false, role: null, userId: null });
        }
    };

    useEffect(() => {
        verify();
    }, []);

    return (
        <AuthContext.Provider value={{ ...auth, refresh: verify }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuthContext = () => useContext(AuthContext);

export default AuthContext;

