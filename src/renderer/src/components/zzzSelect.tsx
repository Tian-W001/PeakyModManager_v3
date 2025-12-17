import clsx from "clsx";
import { useState, useRef, useEffect, ReactNode } from "react";
import { FaCaretDown } from "react-icons/fa6";

export interface Option {
  value: string;
  label: ReactNode;
}

interface CustomSelectProps {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  className?: string;
}

const ZzzSelect = ({ label, value, options, onChange, className }: CustomSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className={"relative"} ref={containerRef}>
      <div
        className={clsx(
          className,
          "hover:text-zzzYellow flex cursor-pointer flex-row items-center justify-between gap-4 overflow-hidden rounded-full bg-black font-bold text-white transition-colors"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate">{label}</span>
        <div className="flex flex-1 items-center justify-end gap-2">
          <span className="truncate text-right">{selectedOption ? selectedOption.label : value}</span>
          <FaCaretDown size={12} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </div>

      {isOpen && (
        <div className="no-scrollbar absolute top-full right-0 left-0 z-50 mt-2 max-h-50 overflow-auto rounded-3xl border-2 bg-[#111] p-2 shadow-xl">
          {options.map((option) => (
            <div
              key={option.value}
              className={`hover:bg-zzzYellow cursor-pointer rounded-lg px-4 py-2 text-right font-bold text-white transition-colors hover:text-black ${option.value === value ? "text-zzzYellow" : ""}`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ZzzSelect;
