import { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import AlertModal from "../modal/alertModal";

export const useAlertModal = () => {
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message?: string;
    children?: React.ReactNode;
  } | null>(null);

  const hideAlert = useCallback(() => {
    setAlertConfig(null);
  }, []);

  const showAlert = useCallback((title: string, message: string | undefined, children: React.ReactNode) => {
    setAlertConfig({ title, message, children });
  }, []);

  const RenderAlert = () => {
    if (!alertConfig) return null;
    return createPortal(
      <AlertModal title={alertConfig.title} message={alertConfig.message}>
        {alertConfig.children}
      </AlertModal>,
      document.body
    );
  };

  return { showAlert, hideAlert, RenderAlert };
};
