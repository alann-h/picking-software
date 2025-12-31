import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Lock, CreditCard } from 'lucide-react';

export const PaymentWall: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { subscriptionStatus, isLoading } = useAuth() as any;
    const location = useLocation();

    // Allow access to settings to let them subscribe
    if (location.pathname.startsWith('/settings')) {
        return <>{children}</>;
    }

    if (!isLoading && subscriptionStatus !== 'active') {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
                <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center border border-gray-100">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Lock size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Subscription Required</h1>
                    <p className="text-gray-500 mb-8">
                        Your company's subscription is inactive. Please update your payment method to continue accessing the platform.
                    </p>
                    
                    <a 
                        href="/settings/billing" 
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg transform active:scale-95"
                    >
                        <CreditCard size={20} />
                        Go to Billing
                    </a>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};
