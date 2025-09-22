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

    const invalidateAndRefetch = () => {
        queryClient.invalidateQueries({ queryKey: ['quote', quoteId, statusFromUrl] });
    };

    // ====================================================================================
    // 2. MUTATIONS
    // ====================================================================================

    const adjustQuantity = useMutation({
        mutationFn: (variables: { productId: number; newQty: number }) =>
            adjustProductQty(quoteId, variables.productId, variables.newQty),
        onSuccess: () => {
            handleOpenSnackbar('Quantity adjusted successfully!', 'success');
            invalidateAndRefetch();
        },
        onError: (error) => handleOpenSnackbar(extractErrorMessage(error), 'error'),
    });

    const saveForLater = useMutation({
        mutationFn: (productId: number) => saveProductForLater(quoteId, productId),
        onSuccess: (data) => {
            const response = data as { message: string };
            handleOpenSnackbar(response.message, 'success');
            invalidateAndRefetch();
        },
        onError: (error) => handleOpenSnackbar(extractErrorMessage(error), 'error'),
    });
    
    const setUnavailable = useMutation({
        mutationFn: (productId: number) => setProductUnavailable(quoteId, productId),
        onSuccess: (data) => {
            const response = data as { message: string };
            handleOpenSnackbar(response.message, 'success');
            invalidateAndRefetch();
        },
        onError: (error) => handleOpenSnackbar(extractErrorMessage(error), 'error'),
    });

    const setFinished = useMutation({
        mutationFn: (productId: number) => setProductFinished(quoteId, productId),
        onSuccess: (data) => {
            const response = data as { message: string };
            handleOpenSnackbar(response.message, 'success');
            invalidateAndRefetch();
        },
        onError: (error) => handleOpenSnackbar(extractErrorMessage(error), 'error'),
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
        onSuccess: (_, newStatus) => { 
            handleOpenSnackbar(`Quote status updated!`, 'success'); 
            // Update URL to include status
            const newUrl = `/quote?id=${quoteId}&status=${newStatus}`;
            navigate(newUrl);
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
    const confirmBarcodeScan = useMutation({ mutationFn: (variables: { barcode: string, quantity: number }) => barcodeScan(variables.barcode, quoteId, variables.quantity), onSuccess: () => { handleOpenSnackbar('Product scanned successfully!', 'success'); invalidateAndRefetch(); }, onError: (error) => handleOpenSnackbar(extractErrorMessage(error), 'error'), });

    const handleBarcodeScan = useCallback(async (barcode: string) => {
        try {
            const response = await barcodeToName(barcode) as { productName: string };
            const { productName } = response;
            const product = Object.values(quoteData?.productInfo || {}).find(p => p.barcode === barcode);
            
            if (!product) {
                throw new Error('Product not found in this quote.');
            }
            if (product.pickingQty === 0) {
                throw new Error('This product has already been fully picked.');
            }

            openModal('barcodeModal', {
                productName,
                availableQty: product.pickingQty,
                onConfirm: (quantity: number) => confirmBarcodeScan.mutate({ barcode, quantity }),
            });
        } catch (error: unknown) {
            handleOpenSnackbar(extractErrorMessage(error), 'error');
        }
    }, [quoteData, openModal, confirmBarcodeScan, handleOpenSnackbar]);

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
        quoteData,
        actions,
        pendingStates,
    };
};