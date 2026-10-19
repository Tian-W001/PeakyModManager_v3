import clsx from "clsx";
import type { ReactNode } from "react";
import { FaCaretUp } from "react-icons/fa6";

const SelectTrigger = ({
  onClick,
  isOpen,
  selectedLabel,
}: {
  onClick: () => void;
  isOpen: boolean;
  selectedLabel: ReactNode;
}) => (
  <button
    type="button"
    className="flex w-full cursor-pointer items-center justify-end gap-2 text-right"
    onClick={onClick}
  >
    <span className="truncate">{selectedLabel}</span>
    <FaCaretUp size={12} className={clsx("shrink-0 transition-transform", isOpen && "rotate-180")} />
  </button>
);

export default SelectTrigger;
