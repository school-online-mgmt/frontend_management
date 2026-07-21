import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import ForcedPasswordChange from './ForcedPasswordChange';

const ProtectedRoute: React.FC = () => {
    const { isAuthenticated, mustChangePassword } = useAuth();

    if (isAuthenticated === null) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600" />
            </div>
        );
    }

    if (!isAuthenticated) return <Navigate to="/login" />;

    // Gate BEFORE the onboarding wizard and every other route: an admin created
    // with a temporary password sets their own first, then lands in onboarding.
    if (mustChangePassword) return <ForcedPasswordChange />;

    return <Outlet />;
};

export default ProtectedRoute;
