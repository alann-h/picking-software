import { useState } from 'react';

export type ModalType = 'barcode' | 'addProduct' | 'productDetails' | 'adjustQuantity';

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

  const openModal = (type: ModalType, data: any = null) => {
    setModalState({ type, isOpen: true, data });
  };

  const closeModal = () => {
    setModalState({ type: null, isOpen: false, data: null });
  };

  return { modalState, openModal, closeModal };
};