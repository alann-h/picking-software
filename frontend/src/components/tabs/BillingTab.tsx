import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Loader, CreditCard, ExternalLink, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { getBillingDetails, createCheckoutSession, createPortalSession } from '../../api/billing';

const BillingTab = () => {
    const { subscriptionStatus } = useAuth() as any;
    const [loading, setLoading] = useState(false);
    const [details, setDetails] = useState<any>(null);

    React.useEffect(() => {
        getBillingDetails()
            .then((data: any) => setDetails(data))
            .catch(err => console.error('Failed to fetch billing details', err));
    }, []);

    const handleSubscribe = async () => {
        setLoading(true);
        try {
            const data: any = await createCheckoutSession();
            if (data.url) {
                window.location.href = data.url;
            } else {
                alert('Failed to start checkout');
            }
        } catch (err) {
            console.error(err);
            alert('Error creating checkout session');
        } finally {
            setLoading(false);
        }
    };

    const handleManage = async () => {
        setLoading(true);
        try {
            const data: any = await createPortalSession();
            if (data && data.url) {
                window.location.href = data.url;
            } else {
                alert('Failed to open billing portal');
            }
        } catch (err) {
            console.error(err);
            alert('Error opening billing portal');
        } finally {
            setLoading(false);
        }
    };

    const isActive = subscriptionStatus === 'active';
    const subscription = details?.subscription;
    const payments = details?.payments || [];
    
    // Determine detailed status
    const isCanceling = subscription?.cancel_at_period_end;
    const cancelDate = subscription?.cancel_at 
        ? new Date(subscription.cancel_at).toLocaleDateString() 
        : (subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : null);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold text-gray-800">Billing & Subscription</h2>
                <p className="text-gray-500 mt-1">Manage your subscription and view invoices.</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-3xl">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Current Status</span>
                            {isActive ? (
                                <div className="flex gap-2">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isCanceling ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                        <CheckCircle size={12} className="mr-1" /> {isCanceling ? 'Active (Canceling)' : 'Active'}
                                    </span>
                                </div>
                            ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    <AlertTriangle size={12} className="mr-1" /> Inactive
                                </span>
                            )}
                        </div>
                        
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">
                            {isActive ? 'Pro Plan' : 'No Active Subscription'}
                        </h3>
                        
                        <div className="text-gray-600 space-y-1">
                            {isActive 
                                ? <p>Your subscription is active. You have full access to all features.</p>
                                : <p>Subscribe to unlock all features including unlimited users and advanced reporting.</p>
                            }
                            
                            {isActive && isCanceling && (
                                <p className="text-amber-700 font-medium text-sm flex items-center gap-1 mt-2">
                                    <AlertTriangle size={14} />
                                    Your subscription will end on {cancelDate}.
                                </p>
                            )}
                            
                            {isActive && !isCanceling && subscription?.current_period_end && (
                                <p className="text-gray-500 text-sm flex items-center gap-1">
                                    <Clock size={14} />
                                    Next billing date: {new Date(subscription.current_period_end).toLocaleDateString()}
                                </p>
                            )}
                        </div>
                    </div>
                    <div>
                        <CreditCard className={isActive ? "text-green-600" : "text-gray-400"} size={48} />
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-100 flex gap-4">
                    {isActive ? (
                        <button
                            onClick={handleManage}
                            disabled={loading}
                            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                        >
                            {loading ? <Loader className="animate-spin" size={18} /> : <ExternalLink size={18} />}
                            Manage Subscription
                        </button>
                    ) : (
                        <button
                            onClick={handleSubscribe}
                            disabled={loading}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-sm"
                        >
                            {loading ? <Loader className="animate-spin" size={18} /> : <CreditCard size={18} />}
                            Subscribe Now
                        </button>
                    )}
                </div>
            </div>

            {/* Invoices Section */}
            {payments && payments.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden max-w-3xl">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                        <h3 className="font-semibold text-gray-800">Payment History</h3>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {payments.map((payment: any) => (
                            <div key={payment.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                <div>
                                    <p className="font-medium text-gray-900">${Number(payment.amount).toFixed(2)} {payment.currency.toUpperCase()}</p>
                                    <p className="text-sm text-gray-500">{new Date(payment.createdAt).toLocaleDateString()}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={`text-xs px-2 py-1 rounded-full capitalize ${payment.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                        {payment.status}
                                    </span>
                                    {payment.invoiceUrl && (
                                        <a href={payment.invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-colors" title="View Invoice">
                                            <ExternalLink size={18} />
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default BillingTab;
