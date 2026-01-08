import { useAppDispatch, useAppSelector } from "@renderer/redux/hooks";
import { loadLibrary } from "@renderer/redux/slices/librarySlice";
import { clsx } from "clsx";
import { useState } from "react";
import { createPortal } from "react-dom";
import SettingsModal from "../modal/settingsModal";
import { useTranslation } from "react-i18next";
import { applyMods, clearDiffList, selectDiffList } from "@renderer/redux/slices/presetsSlice";
import ZzzButton from "./zzzButton";
import useMountTransition from "@renderer/hooks/useMountTransition";
import ZzzToast from "./zzzToast";
import toast from "react-hot-toast";

const BottomBar = ({ className }: { className?: string }) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const [toggleSettingsModalOpen, shouldSettingsModalMount, isSettingsModalTransitioned] = useMountTransition(200);
  const diffList = useAppSelector(selectDiffList);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleOnClickRefresh = async () => {
    setIsRefreshing(true);
    await dispatch(loadLibrary());
    setIsRefreshing(false);
  };

  const handleApplyChanges = async () => {
    const { success, successfulMods } = await window.electron.ipcRenderer.invoke("apply-mods", diffList);
    if (success) {
      dispatch(applyMods(diffList));
      dispatch(clearDiffList());
    } else {
      // Show error toast
      toast.custom(
        () => (
          <ZzzToast
            message={t("common.applyModsError", { count: Object.keys(diffList).length - successfulMods.length })}
          />
        ),
        { duration: 5000 }
      );
      const successfulDiffList: Record<string, boolean> = Object.fromEntries(
        Object.entries(diffList).filter(([modName]) => successfulMods.includes(modName))
      );
      dispatch(applyMods(successfulDiffList));
      dispatch(clearDiffList());
    }
  };

  const getApplyButtonText = () => {
    const adds = Object.values(diffList).filter(Boolean).length;
    const removes = diffList ? Object.keys(diffList).length - adds : 0;
    const text = `${t("common.apply")} ${adds ? `+${adds} ` : ""}${removes ? `-${removes}` : ""}`;
    return text.trim();
  };

  return (
    <>
      <div className={clsx("flex items-center justify-between gap-8 bg-black px-8 py-3.5", className)} id="bottom-bar">
        <div className="flex justify-center gap-4">
          <ZzzButton type="Setting" onClick={() => toggleSettingsModalOpen()}>
            {t("common.settings")}
          </ZzzButton>
        </div>
        <div className="flex justify-center gap-4">
          <ZzzButton type="Refresh" onClick={handleOnClickRefresh} iconClassName={isRefreshing ? "animate-spin" : ""}>
            {isRefreshing ? t("common.refreshing") : t("common.refresh")}
          </ZzzButton>
          <ZzzButton type="Apply" className="w-50" onClick={handleApplyChanges}>
            {getApplyButtonText()}
          </ZzzButton>
        </div>
      </div>
      {shouldSettingsModalMount &&
        createPortal(
          <SettingsModal
            className={`transition-[opacity_scale] duration-200 ease-in-out ${isSettingsModalTransitioned ? "pointer-events-auto scale-y-100 opacity-100" : "pointer-events-none scale-y-0 opacity-0"}`}
            onClose={() => toggleSettingsModalOpen()}
          />,
          document.body
        )}
    </>
  );
};

export default BottomBar;
