import { useCallback, useState } from 'react';

export type ModalType = 'barcodeModal' | 'addProduct' | 'productDetails' | 'adjustQuantity' | 'quoteInvoice' | 'cameraScanner' | 'finalConfirmation';

export type OpenModalFunction = (_type: ModalType, _data: any) => void;
export interface ModalState {
  type: ModalType | null;
  isOpen: boolean;
  data: any;
}

export const useModalState = () => {
  const [modalState, setModalState] = useState<ModalState>({
    type: null,
    isOpen: false,
    data: null
  });

  const openModal = useCallback((type: ModalType, data: any = null) => {
    setModalState({ type, isOpen: true, data });
  }, []);

  const closeModal = useCallback(() => {
    setModalState({ type: null, isOpen: false, data: null });
  }, []);

  return { modalState, openModal, closeModal };
};