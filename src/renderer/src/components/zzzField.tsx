import clsx from "clsx";
import type { ReactNode } from "react";

interface ZzzFieldProps {
  title: string;
  content: ReactNode;
  className?: string;
}

const ZzzField = ({ title, content, className }: ZzzFieldProps) => (
  <div
    className={clsx(
      "hover:text-zzzYellow relative flex min-w-0 items-center justify-between gap-4 rounded-full bg-black px-3 py-1 font-bold text-white shadow-[1px_1px_1px_#fff2] transition-colors",
      className
    )}
  >
    <span className="truncate">{title}</span>
    <div className="min-w-0 flex-1">{content}</div>
  </div>
);

export default ZzzField;
