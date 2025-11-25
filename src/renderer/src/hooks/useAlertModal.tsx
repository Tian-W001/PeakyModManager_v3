import { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import AlertModal, { AlertAction } from "../modal/alertModal";

export const useAlertModal = () => {
  const [alertConfig, setAlertConfig] = useState<{ title: string; message?: string; actions: AlertAction[] } | null>(
    null
  );

  const hideAlert = useCallback(() => {
    setAlertConfig(null);
  }, []);

  const showAlert = useCallback((title: string, message: string | undefined, actions: AlertAction[]) => {
    setAlertConfig({ title, message, actions });
  }, []);

  const RenderAlert = () => {
    if (!alertConfig) return null;
    return createPortal(
      <AlertModal title={alertConfig.title} message={alertConfig.message} actions={alertConfig.actions} />,
      document.body
    );
  };

  return { showAlert, hideAlert, RenderAlert };
};
