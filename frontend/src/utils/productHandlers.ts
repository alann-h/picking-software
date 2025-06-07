import { ProductDetail, QuoteUpdateFunction } from '../utils/types';
import { getProductInfo, saveProductForLater, setProductFinished, setProductUnavailable } from '../api/products';
import { addProductToQuote, adjustProductQty } from '../api/quote';

export const handleProductDetails = async (productId: number, details: ProductDetail) => {
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
        productId: data.productid,
        barcode: data.barcode,
      }
    };
  } catch (error) {
    throw Error(`Error fetching product details: ${error}`);
  }
};

export const handleAdjustQuantity = async (quoteId: number, productId: number, newQty: number, updateQuoteData: QuoteUpdateFunction, ) => {
  try {    
    const data = await adjustProductQty(quoteId, productId, newQty);
    
    updateQuoteData(prevQuoteData => {
      const updatedProductInfo = { ...prevQuoteData.productInfo };

      const product = Object.values(updatedProductInfo).find(
        p => p.productId === productId);
      
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

export const saveForLaterButton = async (quoteId: number, productId: number, updateQuoteData: QuoteUpdateFunction) => {
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

export const setUnavailableButton = async (quoteId: number, productId: number, updateQuoteData: QuoteUpdateFunction) => {
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
    return data;
  } catch (error) {
    throw Error(`${error}`);
  }
};

export const setFinishedButton = async (quoteId: number, productId: number, updateQuoteData: QuoteUpdateFunction) => {
  try {
    const data = await setProductFinished(quoteId, productId);
    
    updateQuoteData(prevQuoteData => {
      const updatedProductInfo = { ...prevQuoteData.productInfo };
      const product = Object.values(updatedProductInfo).find(
        product => product.productId === productId
      );
      if (product) {
        product.pickingStatus = data.newStatus;
        product.pickingQty = data.pickingQty;
      }
      return data;
    });
    return data;
  } catch (error) {
    throw Error(`${error}`);
  }
};


export const handleAddProduct = async (productId: number, quoteId: number, qty: number, updateQuoteData: QuoteUpdateFunction) => {
  try {
    const response = await addProductToQuote(productId, quoteId, qty);

    const detail: ProductDetail = {
      productId: response.productInfo.productid,
      productName: response.productInfo.productname,
      sku: response.productInfo.sku,
      pickingQty: response.productInfo.pickingqty,
      originalQty: response.productInfo.originalqty,
      pickingStatus: response.productInfo.pickingstatus,
      barcode: response.productInfo.barcode,
    };

    if (response.status === 'new') {
      updateQuoteData(prev => ({
        productInfo: {
          // spread existing map, then add the new key -> value
          ...prev.productInfo,
          [detail.barcode]: detail
        },
        totalAmount: response.totalAmt
      }));

    } else {
      updateQuoteData(prev => {
        const updatedProductInfo = { ...prev.productInfo };

        // find and mutate the one entry
        const existing = Object.values(updatedProductInfo)
          .find(p => p.productId === productId);

        if (existing) {
          existing.pickingQty  = detail.pickingQty;
          existing.originalQty = detail.originalQty;
          existing.pickingStatus = detail.pickingStatus; 
        }

        return {
          productInfo: updatedProductInfo,
          totalAmount: response.totalAmt
        };
      });
    }

    return detail;
  } catch (error) {
    throw Error(`Error adding product: ${error}`);
  }
}
