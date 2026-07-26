import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { useKeyBindingCapture } from "@renderer/hooks/useKeyBindingCapture";
import { isNumericToggleState } from "@renderer/utils/threeDMigotoKeyBinding";
import ZzzToast from "@renderer/components/zzzToast";
import {
  ChangeKeyBindingResult,
  ChangeToggleStateResult,
  GetModToggleControlsResult,
  ModToggleControl,
} from "@shared/threeDMigoto";

interface EditableToggle extends ModToggleControl {
  savedState: string;
}

const withSavingId = (current: ReadonlySet<string>, id: string, saving: boolean): Set<string> => {
  const next = new Set(current);
  if (saving) next.add(id);
  else next.delete(id);
  return next;
};

const ToggleKeyEditor = ({ modName }: { modName: string }) => {
  const { t } = useTranslation();
  const [toggles, setToggles] = useState<EditableToggle[]>([]);
  const [loading, setLoading] = useState(true);
  const [warnings, setWarnings] = useState(0);
  const [loadError, setLoadError] = useState<string>();
  const [listeningId, setListeningId] = useState<string>();
  const [savingBindingIds, setSavingBindingIds] = useState<ReadonlySet<string>>(new Set());
  const [savingStateIds, setSavingStateIds] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    let disposed = false;
    setLoading(true);
    setWarnings(0);
    setLoadError(undefined);
    setListeningId(undefined);

    const load = async () => {
      try {
        const result = (await window.electron.ipcRenderer.invoke(
          "get-mod-toggle-controls",
          modName
        )) as GetModToggleControlsResult;
        if (disposed) return;
        setWarnings(result?.warnings?.length ?? 0);
        if (!result?.ok) {
          setLoadError(result?.message ?? t("modDetails.toggleLoadFailed"));
          setToggles([]);
          return;
        }
        setToggles(result.toggles.map((toggle) => ({ ...toggle, savedState: toggle.state })));
      } catch (error) {
        if (!disposed) {
          setLoadError(String(error));
          setToggles([]);
        }
      } finally {
        if (!disposed) setLoading(false);
      }
    };
    void load();

    return () => {
      disposed = true;
    };
  }, [modName, t]);

  const showSaveError = useCallback(
    (message: string) => {
      toast.custom(() => <ZzzToast message={t("modDetails.toggleSaveFailed", { message })} />, {
        duration: 4000,
      });
    },
    [t]
  );

  const saveBinding = useCallback(
    async (toggleId: string, binding: string) => {
      const toggle = toggles.find((candidate) => candidate.id === toggleId);
      if (!toggle?.keyBindingId) return;
      setSavingBindingIds((current) => withSavingId(current, toggleId, true));

      try {
        const result = (await window.electron.ipcRenderer.invoke("change-key-binding", {
          modName,
          iniPath: toggle.iniPath,
          keyBindingId: toggle.keyBindingId,
          keys: [binding],
        })) as ChangeKeyBindingResult;
        if (!result.ok) {
          showSaveError(result.message);
          return;
        }

        const nextBinding = result.after.keys[0];
        setToggles((current) =>
          current.map((candidate) =>
            candidate.iniPath === toggle.iniPath && candidate.keyBindingId === toggle.keyBindingId
              ? { ...candidate, binding: nextBinding }
              : candidate
          )
        );
      } catch (error) {
        showSaveError(String(error));
      } finally {
        setSavingBindingIds((current) => withSavingId(current, toggleId, false));
      }
    },
    [modName, showSaveError, toggles]
  );

  const saveState = useCallback(
    async (toggleId: string) => {
      const toggle = toggles.find((candidate) => candidate.id === toggleId);
      if (
        !toggle ||
        !isNumericToggleState(toggle.state) ||
        toggle.state === toggle.savedState ||
        savingStateIds.has(toggleId)
      ) {
        return;
      }
      setSavingStateIds((current) => withSavingId(current, toggleId, true));

      try {
        const result = (await window.electron.ipcRenderer.invoke("change-toggle-state", {
          modName,
          iniPath: toggle.iniPath,
          variableName: toggle.variableName,
          value: toggle.state,
        })) as ChangeToggleStateResult;
        if (!result.ok) {
          showSaveError(result.message);
          return;
        }

        setToggles((current) =>
          current.map((candidate) =>
            candidate.id === toggleId
              ? {
                  ...candidate,
                  state: candidate.state === toggle.state ? result.after.value : candidate.state,
                  savedState: result.after.value,
                }
              : candidate
          )
        );
      } catch (error) {
        showSaveError(String(error));
      } finally {
        setSavingStateIds((current) => withSavingId(current, toggleId, false));
      }
    },
    [modName, savingStateIds, showSaveError, toggles]
  );

  const handleCapture = useCallback(
    (binding: string) => {
      if (!listeningId) return;
      const capturedId = listeningId;
      setListeningId(undefined);
      void saveBinding(capturedId, binding);
    },
    [listeningId, saveBinding]
  );
  const handleCancelCapture = useCallback(() => setListeningId(undefined), []);
  useKeyBindingCapture({
    active: Boolean(listeningId),
    onCapture: handleCapture,
    onCancel: handleCancelCapture,
  });

  if (loading || loadError || toggles.length === 0) return null;

  return (
    <div className="peer/toggles group/toggles relative z-10 min-h-8 shrink-0 grow-0 basis-8 overflow-hidden transition-[flex-grow] duration-300 ease-out focus-within:grow hover:grow">
      <div className="flex h-full min-h-8 flex-col overflow-hidden rounded-2xl bg-black font-bold text-white shadow-[1px_1px_1px_#fff2]">
        <div className="hover:text-zzzYellow flex h-8 shrink-0 items-center justify-between gap-4 rounded-full px-3.5 py-1 transition-colors">
          <span>{t("modDetails.toggles")}</span>
          <span className={clsx("truncate text-right", warnings > 0 && "text-amber-400")} aria-live="polite">
            {t("modDetails.toggleCount", { count: toggles.length })}
            {warnings > 0 ? ` · ${warnings}!` : ""}
          </span>
        </div>
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto border-t border-white/10 px-2 py-1">
          {toggles.map((toggle) => {
            const listening = listeningId === toggle.id;
            const savingBinding = savingBindingIds.has(toggle.id);
            const savingState = savingStateIds.has(toggle.id);
            const numericState = isNumericToggleState(toggle.state);
            return (
              <div
                key={toggle.id}
                className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)_minmax(3.5rem,.65fr)] items-center gap-2 border-t border-white/6 px-2 py-1.5 text-sm first:border-t-0"
              >
                <span className="truncate text-white/85">{toggle.variableName}</span>
                <button
                  type="button"
                  disabled={!toggle.keyBindingId || savingBinding}
                  onClick={() => setListeningId((current) => (current === toggle.id ? undefined : toggle.id))}
                  aria-pressed={listening}
                  className={clsx(
                    "hover:text-zzzYellow focus:text-zzzYellow min-w-0 cursor-pointer truncate px-2 py-0.5 text-center text-xs transition-colors",
                    listening && "text-zzzYellow animate-pulse",
                    !toggle.keyBindingId && "cursor-not-allowed text-white/30",
                    savingBinding && "cursor-wait text-white/50"
                  )}
                >
                  {listening
                    ? t("modDetails.toggleListening")
                    : savingBinding
                      ? t("common.refreshing")
                      : toggle.binding || t("modDetails.toggleUnbound")}
                </button>
                <input
                  value={toggle.state}
                  onChange={(event) => {
                    const value = event.target.value === "" ? toggle.savedState : event.target.value;
                    setToggles((current) =>
                      current.map((candidate) =>
                        candidate.id === toggle.id ? { ...candidate, state: value } : candidate
                      )
                    );
                  }}
                  onBlur={() => void saveState(toggle.id)}
                  onFocus={(event) => event.currentTarget.select()}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                  }}
                  className={clsx(
                    "min-w-0 px-2 py-0.5 text-right text-xs transition-colors",
                    numericState && "hover:text-zzzYellow focus:text-zzzYellow",
                    !numericState && "text-red-400 line-through decoration-2 hover:text-red-400 focus:text-red-400",
                    savingState && "cursor-wait opacity-60"
                  )}
                  spellCheck={false}
                  aria-invalid={!numericState}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ToggleKeyEditor;
