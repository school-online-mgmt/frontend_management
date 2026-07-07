import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

/**
 * Route guard for tenant-account pages (My Account, Platform Bills, Scheduled
 * Jobs, Support Center). Only the school's ADMIN may reach these — PRINCIPAL,
 * DIRECTOR, MANAGEMENT_STAFF, ACCOUNTANT and TEACHER are redirected to the
 * dashboard. Nav links for these pages are hidden for non-admins too, but this
 * guard is the real enforcement (blocks direct URL access).
 */
const AdminRoute: React.FC = () => {
    const { isAuthenticated, user } = useAuth();

    if (isAuthenticated === null) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600" />
            </div>
        );
    }
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (user?.role !== 'ADMIN') return <Navigate to="/dashboard" replace />;
    return <Outlet />;
};

export default AdminRoute;
