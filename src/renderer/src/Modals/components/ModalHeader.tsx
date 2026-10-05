import clsx from "clsx";
import type { ReactNode } from "react";
import DecoratedTitle from "./DecoratedTitle";
import Exit from "./Exit";

const ModalHeader = ({
  children,
  onClose,
  className,
}: {
  children: ReactNode;
  onClose: () => void;
  className?: string;
}) => (
  <div className={clsx("flex items-center justify-between bg-black/20 px-4 py-2", className)} id="modal-header">
    <DecoratedTitle className="flex min-w-0 items-center gap-2" id="title-wrapper">
      {children}
    </DecoratedTitle>
    <Exit onClick={onClose} />
  </div>
);

export default ModalHeader;
