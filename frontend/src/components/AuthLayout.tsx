import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider } from './AuthProvider';
import { useAuth } from './hooks/useAuth';
import TopBar from './TopBar';

const ProtectedLayout = () => {
    const { isAuthenticated } = useAuth();
    const location = useLocation();

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return (
        <>
            <TopBar disableTopBar={false} />
            <Outlet />
        </>
    );
};

const AuthLayout = () => {
    return (
        <AuthProvider>
            <ProtectedLayout />
        </AuthProvider>
    );
};

export default AuthLayout;