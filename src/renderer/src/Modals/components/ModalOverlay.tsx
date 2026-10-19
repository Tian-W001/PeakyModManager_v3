import clsx from "clsx";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import useMountTransition from "@renderer/hooks/useMountTransition";
import styles from "./ModalOverlay.module.css";

const ModalOverlay = ({
  isOpen,
  children,
  className,
  duration = 200,
}: {
  isOpen: boolean;
  children: ReactNode;
  className?: string;
  duration?: number;
}) => {
  const [toggleOpen, shouldMount, isVisible] = useMountTransition(duration);

  useEffect(() => {
    toggleOpen(isOpen);
  }, [isOpen, toggleOpen]);

  if (!shouldMount) return null;

  return createPortal(
    <div
      className={clsx(styles.overlay, isVisible && styles.visible, className)}
      style={{ transitionDuration: `${duration}ms` }}
      id="modal-overlay"
    >
      {children}
    </div>,
    document.body
  );
};

export default ModalOverlay;
