import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuthContext, type AppModule } from "../context/AuthContext";

interface Props {
    module: AppModule;
    /** Where to send a user who hits a route for a disabled module. */
    redirectTo?: string;
    /** Optional explicit child to render instead of <Outlet />. */
    children?: React.ReactNode;
}

/**
 * Route-level gate that blocks access to modules the school hasn't subscribed
 * to AND modules the user lacks per-user permissions for.
 *
 * IMPORTANT: while auth state is still resolving (`isAuthenticated === null`)
 * we render the child Outlet rather than null. The surrounding ProtectedRoute
 * already shows a spinner during that window; returning null here on top of
 * that would unmount the page tree and paint an empty main column — which
 * looks like a blank screen to the user.
 *
 * Once auth resolves and the user *does* lack the module, we redirect with
 * <Navigate>. Until then we fall open; the backend `requireModule` middleware
 * is the real authority on whether a privileged operation actually runs.
 */
const ModuleGate: React.FC<Props> = ({ module, redirectTo = "/dashboard", children }) => {
    const { user, isAuthenticated, canUseModule } = useAuthContext();

    // Still resolving auth — let the child render; ProtectedRoute owns the
    // spinner state above us.
    if (isAuthenticated === null || !user) {
        return children ? <>{children}</> : <Outlet />;
    }

    if (!canUseModule(module)) {
        return <Navigate to={redirectTo} replace />;
    }

    return children ? <>{children}</> : <Outlet />;
};

export default ModuleGate;
