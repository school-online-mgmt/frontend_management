import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

const ProtectedRoute: React.FC = () => {
    const { isAuthenticated } = useAuth();

    if (isAuthenticated === null) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600" />
            </div>
        );
    }

    return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
};

export default ProtectedRoute;
