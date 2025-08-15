import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useSnackbarContext } from './SnackbarContext';
import { useNotificationContext } from './NotificationContext';
import { OpenModalFunction } from '../utils/modalState';
import { QuoteData, ProductDetail } from '../utils/types';
import { HttpError } from '../utils/apiHelpers';


import {
    extractQuote,
    barcodeScan,
    adjustProductQty,
    addProductToQuote,
    savePickerNote,
    updateQuoteStatus,
    updateQuoteInQuickBooks,
} from '../api/quote';
import {
    getProductInfo,
    saveProductForLater,
    setProductFinished,
    setProductUnavailable,
    barcodeToName
} from '../api/products';
import { useCallback, useMemo } from 'react';


export const useQuoteManager = (quoteId: number, openModal: OpenModalFunction) => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { handleOpenSnackbar } = useSnackbarContext();
    const { notifyOrderCompleted } = useNotificationContext();

    const { data: quoteData } = useSuspenseQuery<QuoteData, HttpError>({
        queryKey: ['quote', quoteId],
        queryFn: async () => {
            const response = await extractQuote(quoteId);
            if (response.data.error) {
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
        queryClient.invalidateQueries({ queryKey: ['quote', quoteId] });
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
        onError: (error) => handleOpenSnackbar(error.message, 'error'),
    });

    const saveForLater = useMutation({
        mutationFn: (productId: number) => saveProductForLater(quoteId, productId),
        onSuccess: (data) => {
            handleOpenSnackbar(data.message, 'success');
            invalidateAndRefetch();
        },
        onError: (error) => handleOpenSnackbar(error.message, 'error'),
    });
    
    const setUnavailable = useMutation({
        mutationFn: (productId: number) => setProductUnavailable(quoteId, productId),
        onSuccess: (data) => {
            handleOpenSnackbar(data.message, 'success');
            invalidateAndRefetch();
        },
        onError: (error) => handleOpenSnackbar(error.message, 'error'),
    });

    const setFinished = useMutation({
        mutationFn: (productId: number) => setProductFinished(quoteId, productId),
        onSuccess: (data) => {
            handleOpenSnackbar(data.message, 'success');
            invalidateAndRefetch();
        },
        onError: (error) => handleOpenSnackbar(error.message, 'error'),
    });

    const addProduct = useMutation({
        mutationFn: (variables: { productId: number; qty: number }) =>
            addProductToQuote(variables.productId, quoteId, variables.qty),
        onSuccess: () => {
            handleOpenSnackbar('Product added successfully!', 'success');
            invalidateAndRefetch();
        },
        onError: (error) => handleOpenSnackbar(error.message, 'error'),
    });
    
    const saveNote = useMutation({ mutationFn: (note: string) => savePickerNote(quoteId, note), onSuccess: () => handleOpenSnackbar('Note saved!', 'success'), onError: (error) => handleOpenSnackbar(error.message, 'error'), });
    const setQuoteChecking = useMutation({ mutationFn: (newStatus: string) => updateQuoteStatus(quoteId, newStatus), onSuccess: () => { handleOpenSnackbar(`Quote status updated!`, 'success'); navigate('/dashboard'); }, onError: (error) => handleOpenSnackbar(error.message, 'error'), });
    const finaliseInvoice = useMutation({ 
        mutationFn: () => updateQuoteInQuickBooks(quoteId), 
        onSuccess: () => { 
            const qbWindow = window.open('https://qbo.intuit.com/', '_blank'); 
            setTimeout(() => { 
                if (qbWindow) qbWindow.location.href = `https://qbo.intuit.com/app/estimate?txnId=${quoteId}`; 
            }, 3000); 
            
            // Trigger notification for order completion
            notifyOrderCompleted(
                quoteId, 
                quoteData.customerName, 
                quoteData.totalAmount
            );
            
            handleOpenSnackbar('Quote finalised and opened in QuickBooks!', 'success'); 
            navigate('/dashboard'); 
        }, 
        onError: (error) => handleOpenSnackbar(error.message, 'error'), 
    });
    const confirmBarcodeScan = useMutation({ mutationFn: (variables: { barcode: string, quantity: number }) => barcodeScan(variables.barcode, quoteId, variables.quantity), onSuccess: () => { handleOpenSnackbar('Product scanned successfully!', 'success'); invalidateAndRefetch(); }, onError: (error) => handleOpenSnackbar(error.message, 'error'), });

    const handleBarcodeScan = useCallback(async (barcode: string) => {
        try {
            const { productName } = await barcodeToName(barcode);
            const product = Object.values(quoteData?.productInfo || {}).find(p => p.barcode === barcode);
            
            if (!product) {
                throw new Error('Product not found in this quote.');
            }
            if (product.pickingQty === 0) {
                throw new Error('This product has already been fully picked.');
            }

            openModal('barcode', {
                productName,
                availableQty: product.pickingQty,
                onConfirm: (quantity: number) => confirmBarcodeScan.mutate({ barcode, quantity }),
            });
        } catch (error: any) {
            handleOpenSnackbar(error.message, 'error');
        }
    }, [quoteData, openModal, confirmBarcodeScan, handleOpenSnackbar, barcodeToName]);

    const openProductDetailsModal = useCallback(async (productId: number, details: ProductDetail) => {
        try {
            const data = await getProductInfo(productId);
            openModal('productDetails', {
                name: data.productname,
                details: { 
                    ...details,
                    qtyOnHand: parseFloat(data.quantity_on_hand) || 0,
                }
            });
        } catch (error: any) {
            handleOpenSnackbar(error.message, 'error');
        }
    }, [openModal, handleOpenSnackbar, getProductInfo]);

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