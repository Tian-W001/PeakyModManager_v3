import useMountTransition from "@renderer/hooks/useMountTransition";
import clsx from "clsx";
import { useRef, useEffect, ReactNode } from "react";

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
  placement: "top" | "bottom";
  className?: string;
}

const ZzzSelectDropdown = ({
  value,
  options,
  onChange,
  isTransitioning,
  placement,
  className,
}: ZzzSelectDropdownProps) => (
  <div
    className={clsx(
      "no-scrollbar absolute right-0 z-50 max-h-50 overflow-auto rounded-3xl bg-[#222] p-2 shadow-xl transition-[opacity_translate] duration-200 ease-in-out",
      placement === "top" ? "bottom-full mb-2" : "top-full mt-2",
      isTransitioning
        ? "pointer-events-auto translate-y-0 opacity-100"
        : ["pointer-events-none opacity-0", placement === "top" ? "translate-y-[50%]" : "-translate-y-[50%]"],
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

interface ZzzSelectProps {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placement?: "top" | "bottom";
  dropdownClassName?: string;
  renderTrigger: (props: { onClick: () => void; isOpen: boolean; selectedLabel: ReactNode }) => ReactNode;
}

const ZzzSelect = ({
  value,
  options,
  onChange,
  placement = "bottom",
  dropdownClassName = "left-0",
  renderTrigger,
}: ZzzSelectProps) => {
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
    <div className="relative min-w-0" ref={containerRef} data-dropdown-open={shouldMountDropdown ? "" : undefined}>
      {renderTrigger({
        onClick: () => toggleOpen(),
        isOpen: shouldMountDropdown,
        selectedLabel: selectedOption ? selectedOption.label : value,
      })}

      {shouldMountDropdown && (
        <ZzzSelectDropdown
          value={value}
          options={options}
          isTransitioning={shouldDropdownTransition}
          placement={placement}
          className={dropdownClassName}
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
