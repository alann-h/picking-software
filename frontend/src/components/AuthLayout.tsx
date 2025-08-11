import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider } from './AuthProvider';
import LogoLoader from './LogoLoader';
import { useAuth } from './hooks/useAuth';

const ProtectedLayout = () => {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return <LogoLoader />;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <Outlet />;
};

const AuthLayout = () => {
    return (
        <AuthProvider>
            <ProtectedLayout />
        </AuthProvider>
    );
};

export default AuthLayout;