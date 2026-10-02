import clsx from "clsx";
import type { ReactNode } from "react";
import styles from "./ModalOverlay.module.css";

const ModalOverlay = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={clsx(styles.overlay, className)} id="modal-overlay">
    {children}
  </div>
);

export default ModalOverlay;
