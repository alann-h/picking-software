import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOptimistic } from 'react';
import { useSnackbarContext } from './SnackbarContext';
import { useAuth } from '../hooks/useAuth';

import { OpenModalFunction } from '../utils/modalState';
import { QuoteData, ProductDetail } from '../utils/types';
import { HttpError, extractErrorMessage } from '../utils/apiHelpers';


import {
    extractQuote,
    barcodeScan,
    adjustProductQty,
    addProductToQuote,
    savePickerNote,
    updateQuoteStatus,
    updateQuoteInAccountingService,
} from '../api/quote';
import {
    getProductInfo,
    saveProductForLater,
    setProductFinished,
    setProductUnavailable,
    barcodeToName
} from '../api/products';
import { useCallback, useMemo } from 'react';


export const useQuoteManager = (quoteId: string, openModal: OpenModalFunction) => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const location = useLocation();
    const { handleOpenSnackbar } = useSnackbarContext();
    const { connectionType } = useAuth();

    // Get status from URL params
    const urlParams = new URLSearchParams(location.search);
    const statusFromUrl = urlParams.get('status');

    const { data: quoteData } = useSuspenseQuery<QuoteData, HttpError>({
        queryKey: ['quote', quoteId, statusFromUrl],
        queryFn: async () => {
            const response = await extractQuote(quoteId) as { data: QuoteData };
            if ('error' in response.data && response.data.error) {
                throw response.data;
            }
            return response.data;
        },
        select: (data) => {
            return {
                ...data,
                productInfo: data.productInfo || {},
            };
        },
        retry: (failureCount, error) => {
            const status = error.response?.status;
            if (status === 404 || status === 409) {
                return false; 
            }

            return failureCount < 3;
        },
    });

    // Optimistic updates for product operations
    type ProductUpdate = 
        | { type: 'status'; productId: number; status: string }
        | { type: 'quantity'; productId: number; quantity: number };

    const [optimisticQuoteData, updateOptimisticProduct] = useOptimistic(
        quoteData,
        (currentData: QuoteData, update: ProductUpdate): QuoteData => {
            const updatedProductInfo = { ...currentData.productInfo };
            
            if (update.type === 'status') {
                const product = updatedProductInfo[update.productId];
                if (product) {
                    updatedProductInfo[update.productId] = {
                        ...product,
                        pickingStatus: update.status
                    };
                }
            } else if (update.type === 'quantity') {
                const product = updatedProductInfo[update.productId];
                if (product) {
                    updatedProductInfo[update.productId] = {
                        ...product,
                        pickingQty: update.quantity
                    };
                }
            }
            
            return {
                ...currentData,
                productInfo: updatedProductInfo
            };
        }
    );

    const invalidateAndRefetch = () => {
        queryClient.invalidateQueries({ queryKey: ['quote', quoteId, statusFromUrl] });
    };

    // ====================================================================================
    // 2. MUTATIONS
    // ====================================================================================

    const adjustQuantity = useMutation({
        mutationFn: async (variables: { productId: number; newQty: number }) => {
            return adjustProductQty(quoteId, variables.productId, variables.newQty);
        },
        onMutate: async (variables: { productId: number; newQty: number }) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['quote', quoteId, statusFromUrl] });
            
            // Update optimistically
            updateOptimisticProduct({ type: 'quantity', productId: variables.productId, quantity: variables.newQty });
        },
        onSuccess: (_, variables) => {
            handleOpenSnackbar('Quantity adjusted successfully!', 'success');
            
            // Update cache directly instead of invalidating
            queryClient.setQueryData(['quote', quoteId, statusFromUrl], (old: QuoteData | undefined) => {
                if (!old) return old;
                return {
                    ...old,
                    productInfo: {
                        ...old.productInfo,
                        [variables.productId]: {
                            ...old.productInfo[variables.productId],
                            pickingQty: variables.newQty
                        }
                    }
                };
            });
        },
        onError: (error) => {
            handleOpenSnackbar(extractErrorMessage(error), 'error');
            // On error, invalidate to get fresh data
            invalidateAndRefetch();
        },
    });

    const saveForLater = useMutation({
        mutationFn: async (productId: number) => {
            return saveProductForLater(quoteId, productId);
        },
        onMutate: async (productId: number) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['quote', quoteId, statusFromUrl] });
            
            const currentProduct = optimisticQuoteData.productInfo[productId];
            const newStatus = currentProduct?.pickingStatus === 'backorder' ? 'pending' : 'backorder';
            
            // Update optimistically
            updateOptimisticProduct({ type: 'status', productId, status: newStatus });
            
            return { productId, newStatus };
        },
        onSuccess: (data, _, context) => {
            const response = data as { message: string };
            handleOpenSnackbar(response.message, 'success');
            
            // Update cache directly
            queryClient.setQueryData(['quote', quoteId, statusFromUrl], (old: QuoteData | undefined) => {
                if (!old || !context) return old;
                return {
                    ...old,
                    productInfo: {
                        ...old.productInfo,
                        [context.productId]: {
                            ...old.productInfo[context.productId],
                            pickingStatus: context.newStatus
                        }
                    }
                };
            });
        },
        onError: (error) => {
            handleOpenSnackbar(extractErrorMessage(error), 'error');
            invalidateAndRefetch();
        },
    });
    
    const setUnavailable = useMutation({
        mutationFn: async (productId: number) => {
            return setProductUnavailable(quoteId, productId);
        },
        onMutate: async (productId: number) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['quote', quoteId, statusFromUrl] });
            
            const currentProduct = optimisticQuoteData.productInfo[productId];
            const newStatus = currentProduct?.pickingStatus === 'unavailable' ? 'pending' : 'unavailable';
            
            // Update optimistically
            updateOptimisticProduct({ type: 'status', productId, status: newStatus });
            
            return { productId, newStatus };
        },
        onSuccess: (data, _, context) => {
            const response = data as { message: string };
            handleOpenSnackbar(response.message, 'success');
            
            // Update cache directly
            queryClient.setQueryData(['quote', quoteId, statusFromUrl], (old: QuoteData | undefined) => {
                if (!old || !context) return old;
                return {
                    ...old,
                    productInfo: {
                        ...old.productInfo,
                        [context.productId]: {
                            ...old.productInfo[context.productId],
                            pickingStatus: context.newStatus
                        }
                    }
                };
            });
        },
        onError: (error) => {
            handleOpenSnackbar(extractErrorMessage(error), 'error');
            invalidateAndRefetch();
        },
    });

    const setFinished = useMutation({
        mutationFn: async (productId: number) => {
            return setProductFinished(quoteId, productId);
        },
        onMutate: async (productId: number) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['quote', quoteId, statusFromUrl] });
            
            // Update optimistically
            updateOptimisticProduct({ type: 'status', productId, status: 'completed' });
            
            return { productId, newStatus: 'completed' };
        },
        onSuccess: (data, _, context) => {
            const response = data as { message: string };
            handleOpenSnackbar(response.message, 'success');
            
            // Update cache directly
            queryClient.setQueryData(['quote', quoteId, statusFromUrl], (old: QuoteData | undefined) => {
                if (!old || !context) return old;
                return {
                    ...old,
                    productInfo: {
                        ...old.productInfo,
                        [context.productId]: {
                            ...old.productInfo[context.productId],
                            pickingStatus: context.newStatus
                        }
                    }
                };
            });
        },
        onError: (error) => {
            handleOpenSnackbar(extractErrorMessage(error), 'error');
            invalidateAndRefetch();
        },
    });

    const addProduct = useMutation({
        mutationFn: (variables: { productId: number; qty: number }) =>
            addProductToQuote(variables.productId, quoteId, variables.qty),
        onSuccess: () => {
            handleOpenSnackbar('Product added successfully!', 'success');
            invalidateAndRefetch();
        },
        onError: (error) => handleOpenSnackbar(extractErrorMessage(error), 'error'),
    });
    
    const saveNote = useMutation({ mutationFn: (note: string) => savePickerNote(quoteId, note), onSuccess: () => handleOpenSnackbar('Note saved!', 'success'), onError: (error) => handleOpenSnackbar(error.message, 'error'), });
    const setQuoteChecking = useMutation({ 
        mutationFn: (newStatus: string) => updateQuoteStatus(quoteId, newStatus), 
        onSuccess: () => { 
            handleOpenSnackbar(`Quote status updated!`, 'success'); 
            // Navigate to dashboard after successful status update
            navigate('/dashboard');
        }, 
        onError: (error) => handleOpenSnackbar(extractErrorMessage(error), 'error'), 
    });
    const finaliseInvoice = useMutation({ 
        mutationFn: () => updateQuoteInAccountingService(quoteId), 
        onSuccess: (response) => { 
            const serviceName = connectionType === 'xero' ? 'Xero' : 'QuickBooks';
            const responseData = response as { redirectUrl?: string };

            if (connectionType === 'xero') {
                // For Xero, use the constructed URL from backend
                if (responseData.redirectUrl) {
                    window.open(responseData.redirectUrl, '_blank');
                } else {
                    // Fallback to general quotes page
                    window.open('https://go.xero.com/app/quotes', '_blank');
                }
            } else {
                // For QuickBooks, use the constructed URL from backend
                if (responseData.redirectUrl) {
                    window.open(responseData.redirectUrl, '_blank');
                } else {
                    // Fallback to general QuickBooks page
                    window.open('https://qbo.intuit.com/', '_blank');
                }
            }
            
            handleOpenSnackbar(`Quote finalised and opened in ${serviceName}!`, 'success'); 
            invalidateAndRefetch(); // This will refresh the quote data
            // Update URL to include finalised status
            const newUrl = `/quote?id=${quoteId}&status=finalised`;
            navigate(newUrl); 
        }, 
        onError: (error: Error) => {
            const serviceName = connectionType === 'xero' ? 'Xero' : 'QuickBooks';
            const errorMessage = extractErrorMessage(error);
            
            // Handle specific service errors
            if (errorMessage.includes('re-authentication required')) {
                handleOpenSnackbar(`${serviceName} connection expired. Please reconnect your account in settings.`, 'error');
                navigate('/settings'); // Redirect to settings to reconnect
            } else if (errorMessage.includes('Access denied by')) {
                handleOpenSnackbar(`${serviceName} access denied. Please check your permissions.`, 'error');
            } else {
                handleOpenSnackbar(errorMessage, 'error');
            }
        }, 
    });
    const confirmBarcodeScan = useMutation({ 
        mutationFn: (variables: { barcode: string, quantity: number }) => barcodeScan(variables.barcode, quoteId, variables.quantity), 
        onSuccess: () => { 
            handleOpenSnackbar('Product scanned successfully!', 'success'); 
            invalidateAndRefetch(); 
        }, 
        onError: (error) => handleOpenSnackbar(extractErrorMessage(error), 'error'), 
    });

    const handleBarcodeScan = useCallback(async (barcode: string) => {
        // Check if product is in the current quote (instant, no API call needed)
        const product = Object.values(optimisticQuoteData?.productInfo || {}).find(p => p.barcode === barcode);
        
        if (!product) {
            handleOpenSnackbar('This product is not included in this quote.', 'error');
            return;
        }
        
        if (product.pickingQty === 0) {
            handleOpenSnackbar('This product has already been fully picked.', 'error');
            return;
        }

        // Open modal instantly - no API call needed!
        openModal('barcodeModal', {
            productName: product.productName,
            availableQty: product.pickingQty,
            onConfirm: (quantity: number) => confirmBarcodeScan.mutate({ barcode, quantity }),
        });
    }, [optimisticQuoteData, openModal, confirmBarcodeScan, handleOpenSnackbar]);

    const openProductDetailsModal = useCallback(async (productId: number, details: ProductDetail) => {
        try {
            const response = await getProductInfo(productId) as { productname: string; quantityOnHand: string };
            openModal('productDetails', {
                name: response.productname,
                details: { 
                    ...details,
                    quantityOnHand: parseFloat(response.quantityOnHand) || 0,
                }
            });
        } catch (error: unknown) {
            handleOpenSnackbar(extractErrorMessage(error), 'error');
        }
    }, [openModal, handleOpenSnackbar]);

    // ====================================================================================
    // 4. RETURN VALUE
    // ====================================================================================
    
    const actions = useMemo(() => ({
        adjustQuantity: adjustQuantity.mutate,
        saveForLater: saveForLater.mutate,
        setUnavailable: setUnavailable.mutate,
        setFinished: setFinished.mutate,
        addProduct: addProduct.mutate,
        saveNote: saveNote.mutate,
        setQuoteChecking: setQuoteChecking.mutate,
        finaliseInvoice: finaliseInvoice.mutate,
        handleBarcodeScan,
        openProductDetailsModal,
        openAdjustQuantityModal: (productId: number, pickingQty: number, productName: string) => {
            openModal('adjustQuantity', { productId, pickingQty, productName });
        },
        openAddProductModal: () => openModal('addProduct', null),
        openQuoteInvoiceModal: () => openModal('quoteInvoice', null),
    }), [
        adjustQuantity.mutate, saveForLater.mutate, setUnavailable.mutate, setFinished.mutate,
        addProduct.mutate, saveNote.mutate, setQuoteChecking.mutate, finaliseInvoice.mutate,
        handleBarcodeScan, openProductDetailsModal, openModal
    ]);

    const pendingStates = useMemo(() => ({
        isAdjustingQuantity: adjustQuantity.isPending,
        isSavingForLater: saveForLater.isPending,
        isSettingUnavailable: setUnavailable.isPending,
        isSettingFinished: setFinished.isPending,
        isAddingProduct: addProduct.isPending,
        isSavingNote: saveNote.isPending,
        isFinalising: finaliseInvoice.isPending,
        isQuoteChecking: setQuoteChecking.isPending
    }), [
        adjustQuantity.isPending, saveForLater.isPending, setUnavailable.isPending,
        setFinished.isPending, addProduct.isPending, saveNote.isPending,
        finaliseInvoice.isPending, setQuoteChecking.isPending
    ]);

    return {
        quoteData: optimisticQuoteData,
        actions,
        pendingStates,
    };
};