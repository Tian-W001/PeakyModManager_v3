import useMountTransition from "@renderer/hooks/useMountTransition";
import clsx from "clsx";
import { useRef, useEffect, ReactNode } from "react";
import { FaCaretDown } from "react-icons/fa6";

export interface Option {
  value: string;
  label: ReactNode;
  labelIcon?: ReactNode;
}

interface ZzzSelectDropdownProps {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  isTransitioning: boolean;
  className?: string;
}

export const ZzzSelectDropdown = ({ value, options, onChange, isTransitioning, className }: ZzzSelectDropdownProps) => (
  <div
    className={clsx(
      "no-scrollbar absolute top-full right-0 z-50 mt-2 max-h-50 overflow-auto rounded-3xl border-2 bg-[#111] p-2 shadow-xl transition-[opacity_translate] duration-200 ease-in-out",
      isTransitioning
        ? "pointer-events-auto translate-y-0 opacity-100"
        : "pointer-events-none -translate-y-[50%] opacity-0",
      className
    )}
  >
    {options.map((option) => (
      <div
        key={option.value}
        className={clsx(
          "hover:bg-zzzYellow flex min-w-0 cursor-pointer items-center justify-end gap-2 rounded-lg px-4 py-2 text-right font-bold text-white transition-colors hover:text-black",
          option.value === value && "text-zzzYellow"
        )}
        onClick={() => onChange(option.value)}
      >
        <div className="min-w-0 truncate">{option.label}</div>
        {option.labelIcon && <div className="shrink-0">{option.labelIcon}</div>}
      </div>
    ))}
  </div>
);

interface CustomSelectProps {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  className?: string;
  showLabelIcon?: boolean;
}

const ZzzSelect = ({ label, value, options, onChange, className, showLabelIcon = false }: CustomSelectProps) => {
  const [toggleOpen, shouldMountDropdown, shouldDropdownTransition] = useMountTransition(200);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        toggleOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [toggleOpen]);

  return (
    <div className="relative min-w-0" ref={containerRef}>
      <div
        className={clsx(
          className,
          "hover:text-zzzYellow flex cursor-pointer flex-row items-center justify-between gap-4 overflow-hidden rounded-full bg-black font-bold text-white transition-colors"
        )}
        onClick={() => toggleOpen()}
      >
        <span className="truncate">{label}</span>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <div className="h-full truncate">{selectedOption ? selectedOption.label : value}</div>
          {showLabelIcon && selectedOption && <div className="shrink-0">{selectedOption.labelIcon}</div>}
          <FaCaretDown
            size={12}
            className={clsx("shrink-0 transition-transform", shouldMountDropdown && "rotate-180")}
          />
        </div>
      </div>

      {shouldMountDropdown && (
        <ZzzSelectDropdown
          value={value}
          options={options}
          isTransitioning={shouldDropdownTransition}
          className="left-0"
          onChange={(value) => {
            onChange(value);
            toggleOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default ZzzSelect;
