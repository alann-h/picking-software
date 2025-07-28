import { ProductDetail, QuoteData } from '../utils/types';
import { barcodeToName } from '../api/products';
import { barcodeScan } from "../api/quote";
import { ModalType } from './modalState';

export const handleBarcodeScanned = async (
  barcode: string,
  quoteData: QuoteData | null,
  setScannedBarcode: (_barcode: string) => void,
  setAvailableQty: (_qty: number) => void,
  setScannedProductName: (_name: string) => void,
  openModal: (_type: ModalType, _data: any) => void
): Promise<void> => {
  setScannedBarcode(barcode);
  const { productName } = await barcodeToName(barcode);

  const product: ProductDetail | undefined = Object.values(quoteData?.productInfo || {}).find(
    (p) => p.barcode === barcode
  );

  if (!product) {
    throw new Error('Product not found in quote data');
  }

  if (product.pickingQty === 0) {
    throw new Error('Product quantity is already 0!');
  }

  setAvailableQty(product.pickingQty);
  setScannedProductName(productName);
  openModal('barcode', { productName });
};

export const handleModalConfirm = (
  scannedBarcode: string,
  quoteId: number,
  inputQty: number,
  updateQuoteData: (updater: (_prevQuoteData: QuoteData) => Partial<QuoteData>) => void
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