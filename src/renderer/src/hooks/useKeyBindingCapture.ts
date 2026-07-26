import { useEffect } from "react";
import { toThreeDMigotoKeyBinding } from "@renderer/utils/threeDMigotoKeyBinding";

interface UseKeyBindingCaptureOptions {
  active: boolean;
  onCapture: (binding: string) => void;
  onCancel: () => void;
}

export const useKeyBindingCapture = ({ active, onCapture, onCancel }: UseKeyBindingCaptureOptions): void => {
  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.repeat) return;
      if (event.code === "Escape") {
        onCancel();
        return;
      }

      const binding = toThreeDMigotoKeyBinding(event);
      if (binding) onCapture(binding);
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [active, onCancel, onCapture]);
};
