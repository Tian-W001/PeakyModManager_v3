import { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import AlertModal from "../modal/alertModal";
import useMountTransition from "./useMountTransition";

export const useAlertModal = () => {
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message?: string;
    children?: React.ReactNode;
  } | null>(null);

  const [toggleAlert, shouldMount, isTransitioned] = useMountTransition(100);

  const hideAlert = useCallback(() => {
    toggleAlert(false);
  }, [toggleAlert]);

  const showAlert = useCallback(
    (title: string, message: string | undefined, children: React.ReactNode) => {
      setAlertConfig({ title, message, children });
      toggleAlert(true);
    },
    [toggleAlert]
  );

  const RenderAlert = () => {
    if (!shouldMount || !alertConfig) return null;
    return createPortal(
      <AlertModal
        title={alertConfig.title}
        message={alertConfig.message}
        className={`transition-[opacity_scale] duration-100 ease-in-out ${isTransitioned ? "pointer-events-auto scale-y-100 opacity-100" : "pointer-events-none scale-y-0 opacity-0"}`}
      >
        {alertConfig.children}
      </AlertModal>,
      document.body
    );
  };

  return { showAlert, hideAlert, RenderAlert };
};
