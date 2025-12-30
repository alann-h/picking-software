import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
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
    setProductUnavailable
} from '../api/products';
import { useCallback, useMemo } from 'react';


export const useQuoteManager = (quoteId: string, openModal: OpenModalFunction, closeModal: () => void) => {
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
            // Don't retry on 404, 409, or 429 errors
            if (status === 404 || status === 409 || status === 429) {
                return false; 
            }

            return failureCount < 3;
        },
        refetchInterval: (query) => {
            const data = query.state.data as QuoteData | undefined;
            // Poll every 60 seconds instead of 10 to reduce API calls
            return data?.orderStatus === 'completed' ? false : 60000;
        },
        refetchIntervalInBackground: false,
    });

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
            await queryClient.cancelQueries({ queryKey: ['quote', quoteId, statusFromUrl] });
            
            const previousData = queryClient.getQueryData<QuoteData>(['quote', quoteId, statusFromUrl]);
            
            queryClient.setQueryData(['quote', quoteId, statusFromUrl], (old: QuoteData | undefined) => {
                if (!old) return old;
                return {
                    ...old,
                    productInfo: {
                        ...old.productInfo,
                        [variables.productId]: {
                            ...old.productInfo[variables.productId],
                            pickingQty: variables.newQty,
                            originalQty: variables.newQty
                        }
                    }
                };
            });
            
            return { previousData };
        },
        onSuccess: () => {
            handleOpenSnackbar('Quantity updated!', 'success');
        },
        onError: (error, _, context) => {
            handleOpenSnackbar(extractErrorMessage(error), 'error');
            if (context?.previousData) {
                queryClient.setQueryData(['quote', quoteId, statusFromUrl], context.previousData);
            }
        },
    });

    const saveForLater = useMutation({
        mutationFn: async (productId: number) => {
            return saveProductForLater(quoteId, productId);
        },
        onMutate: async (productId: number) => {
            await queryClient.cancelQueries({ queryKey: ['quote', quoteId, statusFromUrl] });
            
            const previousData = queryClient.getQueryData<QuoteData>(['quote', quoteId, statusFromUrl]);
            
            const currentProduct = previousData?.productInfo[productId];
            const newStatus = currentProduct?.pickingStatus === 'backorder' ? 'pending' : 'backorder';
            
            queryClient.setQueryData(['quote', quoteId, statusFromUrl], (old: QuoteData | undefined) => {
                if (!old) return old;
                return {
                    ...old,
                    productInfo: {
                        ...old.productInfo,
                        [productId]: {
                            ...old.productInfo[productId],
                            pickingStatus: newStatus
                        }
                    }
                };
            });
            
            return { productId, newStatus, previousData };
        },
        onSuccess: (data) => {
            const response = data as { message: string };
            handleOpenSnackbar(response.message, 'success');
        },
        onError: (error, _, context) => {
            handleOpenSnackbar(extractErrorMessage(error), 'error');
            if (context?.previousData) {
                queryClient.setQueryData(['quote', quoteId, statusFromUrl], context.previousData);
            }
        },
    });
    
    const setUnavailable = useMutation({
        mutationFn: async (productId: number) => {
            return setProductUnavailable(quoteId, productId);
        },
        onMutate: async (productId: number) => {
            await queryClient.cancelQueries({ queryKey: ['quote', quoteId, statusFromUrl] });
            
            const previousData = queryClient.getQueryData<QuoteData>(['quote', quoteId, statusFromUrl]);
            
            const currentProduct = previousData?.productInfo[productId];
            const newStatus = currentProduct?.pickingStatus === 'unavailable' ? 'pending' : 'unavailable';
            
            queryClient.setQueryData(['quote', quoteId, statusFromUrl], (old: QuoteData | undefined) => {
                if (!old) return old;
                return {
                    ...old,
                    productInfo: {
                        ...old.productInfo,
                        [productId]: {
                            ...old.productInfo[productId],
                            pickingStatus: newStatus
                        }
                    }
                };
            });
            
            return { productId, newStatus, previousData };
        },
        onSuccess: (data) => {
            const response = data as { message: string };
            handleOpenSnackbar(response.message, 'success');
        },
        onError: (error, _, context) => {
            handleOpenSnackbar(extractErrorMessage(error), 'error');
            if (context?.previousData) {
                queryClient.setQueryData(['quote', quoteId, statusFromUrl], context.previousData);
            }
        },
    });

    const setFinished = useMutation({
        mutationFn: async (productId: number) => {
            return setProductFinished(quoteId, productId);
        },
        onMutate: async (productId: number) => {
            await queryClient.cancelQueries({ queryKey: ['quote', quoteId, statusFromUrl] });
            
            const previousData = queryClient.getQueryData<QuoteData>(['quote', quoteId, statusFromUrl]);
            
            // Get product details before marking as complete
            const product = previousData?.productInfo[productId];
            const productName = product?.productName || 'Product';
            const pickingQty = product?.pickingQty || 0;
            
            queryClient.setQueryData(['quote', quoteId, statusFromUrl], (old: QuoteData | undefined) => {
                if (!old) return old;
                return {
                    ...old,
                    productInfo: {
                        ...old.productInfo,
                        [productId]: {
                            ...old.productInfo[productId],
                            pickingStatus: 'completed',
                            pickingQty: 0
                        }
                    }
                };
            });
            
            return { productId, previousData, productName, pickingQty };
        },
        onSuccess: (data, _, context) => {
            const productName = context?.productName || 'Product';
            const pickingQty = context?.pickingQty || 0;
            handleOpenSnackbar(`${productName} (qty: ${pickingQty}) marked as complete!`, 'success');
        },
        onError: (error, _, context) => {
            handleOpenSnackbar(extractErrorMessage(error), 'error');
            if (context?.previousData) {
                queryClient.setQueryData(['quote', quoteId, statusFromUrl], context.previousData);
            }
        },
    });

    const addProduct = useMutation({
        mutationFn: (variables: { productId: number; qty: number }) =>
            addProductToQuote(variables.productId, quoteId, variables.qty),
        onSuccess: () => {
            handleOpenSnackbar('Product added to quote!', 'success');
            invalidateAndRefetch();
        },
        onError: (error) => handleOpenSnackbar(extractErrorMessage(error), 'error'),
    });
    
    const saveNote = useMutation({ 
        mutationFn: (note: string) => savePickerNote(quoteId, note), 
        onSuccess: () => handleOpenSnackbar('Picker note saved successfully!', 'success'), 
        onError: (error) => handleOpenSnackbar(extractErrorMessage(error, 'Failed to save note'), 'error'), 
    });
    const setQuoteChecking = useMutation({ 
        mutationFn: (newStatus: string) => updateQuoteStatus(quoteId, newStatus), 
        onSuccess: () => { 
            handleOpenSnackbar(`Quote #${quoteData.quoteNumber} sent to admin for review!`, 'success');
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
                if (responseData.redirectUrl) {
                    window.open(responseData.redirectUrl, '_blank');
                } else {
                    window.open('https://go.xero.com/app/quotes', '_blank');
                }
            } else {
                if (responseData.redirectUrl) {
                    window.open(responseData.redirectUrl, '_blank');
                } else {
                    window.open('https://qbo.intuit.com/', '_blank');
                }
            }
            
            handleOpenSnackbar(`Quote completed and opened in ${serviceName}!`, 'success'); 
            invalidateAndRefetch();
            const newUrl = `/quote?id=${quoteId}&status=completed`;
            navigate(newUrl); 
        }, 
        onError: (error: Error) => {
            const serviceName = connectionType === 'xero' ? 'Xero' : 'QuickBooks';
            const errorMessage = extractErrorMessage(error);
            
            if (errorMessage.includes('re-authentication required')) {
                handleOpenSnackbar(`${serviceName} connection expired. Please reconnect your account in settings.`, 'error');
                navigate('/settings');
            } else if (errorMessage.includes('Access denied by')) {
                handleOpenSnackbar(`${serviceName} access denied. Please check your permissions.`, 'error');
            } else {
                handleOpenSnackbar(errorMessage, 'error');
            }
        }, 
    });
    const confirmBarcodeScan = useMutation({ 
        mutationFn: (variables: { barcode: string, quantity: number, productName: string }) => barcodeScan(variables.barcode, quoteId, variables.quantity),
        onMutate: async (variables: { barcode: string, quantity: number, productName: string }) => {
            await queryClient.cancelQueries({ queryKey: ['quote', quoteId, statusFromUrl] });
            
            const previousData = queryClient.getQueryData<QuoteData>(['quote', quoteId, statusFromUrl]);
            
            // Find the product that matches the scanned barcode
            const normalizedBarcode = variables.barcode.trim().toLowerCase();
            const productEntry = Object.entries(previousData?.productInfo || {}).find(([_, product]) => {
                if (!product.barcode) return false;
                return product.barcode.trim().toLowerCase() === normalizedBarcode;
            });
            
            if (productEntry) {
                const [productId, product] = productEntry;
                const newPickingQty = Math.max(0, product.pickingQty - variables.quantity);
                const newStatus = newPickingQty === 0 ? 'completed' : product.pickingStatus;
                
                queryClient.setQueryData(['quote', quoteId, statusFromUrl], (old: QuoteData | undefined) => {
                    if (!old) return old;
                    return {
                        ...old,
                        productInfo: {
                            ...old.productInfo,
                            [productId]: {
                                ...old.productInfo[parseInt(productId)],
                                pickingQty: newPickingQty,
                                pickingStatus: newStatus
                            }
                        }
                    };
                });
            }
            
            // Close modal and show success immediately
            closeModal();
            handleOpenSnackbar(`${variables.productName} (qty: ${variables.quantity}) scanned!`, 'success');
            
            return { previousData };
        },
        onSuccess: () => { 
            // Silently refetch in background to sync with server
            invalidateAndRefetch();
        }, 
        onError: (error, _, context) => {
            handleOpenSnackbar(extractErrorMessage(error), 'error');
            if (context?.previousData) {
                queryClient.setQueryData(['quote', quoteId, statusFromUrl], context.previousData);
            }
        }, 
    });

    const handleBarcodeScan = useCallback(async (barcode: string) => {
        // Normalize the scanned barcode for comparison
        const normalizedBarcode = barcode.trim().toLowerCase();
        
        const product = Object.values(quoteData?.productInfo || {}).find(p => {
            if (!p.barcode) return false;
            return p.barcode.trim().toLowerCase() === normalizedBarcode;
        });
        
        if (!product) {
            handleOpenSnackbar(`Barcode ${normalizedBarcode} not found in this quote.`, 'error');
            return;
        }
        
        if (product.pickingQty === 0) {
            handleOpenSnackbar(`${product.productName} already fully picked`, 'error');
            return;
        }

        openModal('barcodeModal', {
            productName: product.productName,
            availableQty: product.pickingQty,
            onConfirm: (quantity: number) => confirmBarcodeScan.mutate({ barcode, quantity, productName: product.productName }),
        });
    }, [quoteData, openModal, confirmBarcodeScan, handleOpenSnackbar]);

    const openProductDetailsModal = useCallback(async (productId: number, details: ProductDetail) => {
        try {
            const response = await getProductInfo(productId) as { productName: string; quantityOnHand: string };
            openModal('productDetails', {
                name: response.productName,
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
        isQuoteChecking: setQuoteChecking.isPending,
        isConfirmingBarcode: confirmBarcodeScan.isPending
    }), [
        adjustQuantity.isPending, saveForLater.isPending, setUnavailable.isPending,
        setFinished.isPending, addProduct.isPending, saveNote.isPending,
        finaliseInvoice.isPending, setQuoteChecking.isPending, confirmBarcodeScan.isPending
    ]);

    return {
        quoteData,
        actions,
        pendingStates,
    };
};