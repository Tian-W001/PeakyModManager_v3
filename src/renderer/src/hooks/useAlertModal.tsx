import { useState, useCallback } from "react";
import AlertModal from "@renderer/Modals/AlertModal/modal";

export const useAlertModal = () => {
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message?: string;
    children?: React.ReactNode;
  } | null>(null);

  const [isOpen, setIsOpen] = useState(false);

  const hideAlert = useCallback(() => {
    setIsOpen(false);
  }, []);

  const showAlert = useCallback((title: string, message: string | undefined, children: React.ReactNode) => {
    setAlertConfig({ title, message, children });
    setIsOpen(true);
  }, []);

  const alert = alertConfig && (
    <AlertModal isOpen={isOpen} title={alertConfig.title} message={alertConfig.message}>
      {alertConfig.children}
    </AlertModal>
  );

  return { showAlert, hideAlert, alert };
};
