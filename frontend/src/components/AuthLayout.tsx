import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider } from './AuthProvider';
import { useAuth } from '../hooks/useAuth';
import TopBar from './TopBar';
import { Loader } from 'lucide-react';

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
                <div className="flex justify-center items-center h-[calc(100vh-64px)]">
                    <Loader className="animate-spin text-blue-600" size={48} />
                </div>
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