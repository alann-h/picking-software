import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider } from './AuthProvider';
import { useAuth } from './hooks/useAuth';
import TopBar from './TopBar';
import { Box, CircularProgress } from '@mui/material';

const ProtectedLayout = () => {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

   if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

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