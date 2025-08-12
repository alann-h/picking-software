import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider } from './AuthProvider';
import { useAuth } from './hooks/useAuth';
import TopBar from './TopBar';
import { Box, CircularProgress } from '@mui/material';

const ProtectedLayout = () => {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    if (!isLoading && !isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return (
        <>
            <TopBar disableTopBar={false} />
            {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)' }}>
                    <CircularProgress />
                </Box>
            ) : (
                <Outlet />
            )}
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