import { QuoteData } from '../utils/types';
import { barcodeToName, barcodeScan } from '../api/quote';
import { ModalType } from './modalState';

export const handleBarcodeScanned = (
  barcode: string,
  quoteData: QuoteData | null,
  setScannedBarcode: (barcode: string) => void,
  setAvailableQty: (qty: number) => void,
  setScannedProductName: (name: string) => void,
  openModal: (type: ModalType, data: any) => void
) => {
  setScannedBarcode(barcode);
  barcodeToName(barcode)
    .then(({ productName }) => {
      const product = quoteData?.productInfo[barcode];
      if (product) {
        if (product.pickingQty === 0) {
          throw Error('Product quantity is already 0!');
        } else {
          setAvailableQty(product.pickingQty);
          openModal('barcode', { productName });
          setScannedProductName(productName);
        }
      } else {
        throw Error('Product not found in quote data');
      }
    })
    .catch((error) => {
      throw error.message;
    });
};

export const handleModalConfirm = (
  scannedBarcode: string,
  quoteId: number,
  inputQty: number,
  updateQuoteData: (updater: (prevQuoteData: QuoteData) => Partial<QuoteData>) => void
) => {
  barcodeScan(scannedBarcode, quoteId, inputQty)
    .then((data) => {
      updateQuoteData(prevQuoteData => {
        const updatedProductInfo = { ...prevQuoteData.productInfo };
        const scannedProduct = Object.values(updatedProductInfo).find(
          product => product.productName === data.productName
        );
        if (scannedProduct) {
          scannedProduct.pickingQty = data.updatedQty;
          scannedProduct.pickingStatus = data.pickingStatus;
        }
        return { productInfo: updatedProductInfo };
      });
    })
    .catch((error) => {
      throw Error(`Error scanning barcode: ${error.message}`);
    });
};