import { useState, useCallback } from 'react';

export type ModalType = 'success' | 'error' | 'warning' | 'info';

export interface ModalData {
  type: ModalType;
  title: string;
  message: string;
}

/**
 * Custom hook for managing modal state
 * Provides consistent modal management across components
 * 
 * @returns Object with modal state and handlers
 */
export function useModal() {
  const [visible, setVisible] = useState(false);
  const [modalData, setModalData] = useState<ModalData>({
    type: 'info',
    title: '',
    message: '',
  });

  const showModal = useCallback((type: ModalType, title: string, message: string) => {
    setModalData({ type, title, message });
    setVisible(true);
  }, []);

  const hideModal = useCallback(() => {
    setVisible(false);
  }, []);

  return {
    visible,
    modalData,
    showModal,
    hideModal,
    setVisible,
  };
}





