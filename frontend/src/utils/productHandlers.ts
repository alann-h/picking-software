import { ProductDetail, QuoteUpdateFunction } from '../utils/types';
import { getProductInfo, saveProductForLater, setProductUnavailable } from '../api/others';
import { addProductToQuote, adjustProductQty } from '../api/quote';
import { ModalType } from './modalState';

export const handleProductDetails = async (
  productId: number,
  details: ProductDetail,
) => {
  try {
    const data = await getProductInfo(productId);
    return {
      name: data.productname,
      details: {
        sku: data.sku,
        pickingQty: details.pickingQty,
        originalQty: details.originalQty,
        qtyOnHand: data.quantity_on_hand,
        pickingStatus: details.pickingStatus,
        productId: data.productid
      }
    };
  } catch (error) {
    throw Error(`Error fetching product details: ${error}`);
  }
};

export const handleAdjustQuantity = async (
  quoteId: number, 
  productId: number, 
  newQty: number, 
  updateQuoteData: QuoteUpdateFunction, 
) => {
  try {    
    const data = await adjustProductQty(quoteId, productId, newQty);
    
    updateQuoteData(prevQuoteData => {
        const updatedProductInfo = { ...prevQuoteData.productInfo };
        const product = Object.values(updatedProductInfo).find(
        (product): product is ProductDetail => product.productId === productId
        );
        if (product) {
        product.pickingQty = data.pickingQty;
        product.originalQty = data.originalQty;
        }
        return {
        productInfo: updatedProductInfo,
        totalAmount: data.totalAmount
        };
    });
  } catch (error) {
    throw Error(`Error adjusting product quantity: ${error}`);
  }
};

export const saveForLaterButton = async (
  quoteId: number,
  productId: number,
  updateQuoteData: QuoteUpdateFunction
) => {
  try {
    const data = await saveProductForLater(quoteId, productId);
    updateQuoteData(prevQuoteData => {
      const updatedProductInfo = { ...prevQuoteData.productInfo };
      const product = Object.values(updatedProductInfo).find(
        product => product.productId === productId
      );
      if (product) {
        product.pickingStatus = data.newStatus;
      }
      return data;
    });
    return data;
  } catch (error) {
    throw Error(`${error}`);
  }
};

export const setUnavailableButton = async (
  quoteId: number,
  productId: number,
  updateQuoteData: QuoteUpdateFunction
) => {
  try {
    const data = await setProductUnavailable(quoteId, productId);
    
    updateQuoteData(prevQuoteData => {
      const updatedProductInfo = { ...prevQuoteData.productInfo };
      const product = Object.values(updatedProductInfo).find(
        product => product.productId === productId
      );
      if (product) {
        product.pickingStatus = data.newStatus;
      }
      return data;
    });
    return data.newStatus;
  } catch (error) {
    throw Error(`${error}`);
  }
};

export const handleAddProduct = async (
  productName: string, quoteId: number, qty: number, 
  updateQuoteData: QuoteUpdateFunction,
) => {
  try {
    const response = await addProductToQuote(productName, quoteId, qty);
    if (response.status === 'new') {
      const newProduct: ProductDetail = {
        productId: response.productInfo.productid,
        productName: response.productInfo.productname,
        sku: response.productInfo.sku,
        pickingQty: response.productInfo.pickingqty,
        originalQty: response.productInfo.originalqty,
        pickingStatus: response.productInfo.pickingstatus,
        barcode: response.productInfo.barcode,
      };

      updateQuoteData(prevQuoteData => ({
        ...prevQuoteData,
        productInfo: {
          ...prevQuoteData.productInfo,
          [newProduct.barcode]: newProduct
        },
        totalAmount: response.totalAmt
      }));
    } else if (response.status === 'exists') {
      updateQuoteData(prevQuoteData => {
        const updatedProductInfo = { ...prevQuoteData.productInfo };
        const existingProduct = Object.values(updatedProductInfo).find(
          product => product.productName === productName
        );
        if (existingProduct) {
          existingProduct.pickingQty = response.pickingQty;
          existingProduct.originalQty = response.originalQty;
        }
        return { productInfo: updatedProductInfo, totalAmount: response.totalAmt };
      });
    }
  } catch (error) {
    throw Error(`Error adding product: ${error}`);
  }
}