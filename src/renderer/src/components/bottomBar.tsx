import { useAppDispatch, useAppSelector } from "@renderer/redux/hooks";
import { loadLibrary } from "@renderer/redux/slices/librarySlice";
import { clsx } from "clsx";
import { useState } from "react";
import { createPortal } from "react-dom";
import SettingsModal from "../modal/settingsModal";
import { useTranslation } from "react-i18next";
import { applyMods, clearDiffList, selectDiffList } from "@renderer/redux/slices/presetsSlice";

const BottomBar = ({ className }: { className?: string }) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const diffList = useAppSelector(selectDiffList);

  const handleOnClickRefresh = async () => {
    await dispatch(loadLibrary());
  };

  const handleApplyChanges = async () => {
    dispatch(applyMods(diffList));
    await window.electron.ipcRenderer.invoke("apply-mods", diffList);
    dispatch(clearDiffList());
  };

  const getApplyButtonText = () => {
    const adds = Object.values(diffList).filter(Boolean).length;
    const removes = diffList ? Object.keys(diffList).length - adds : 0;
    const text = `${t("common.apply")} ${adds ? `+${adds} ` : ""}${removes ? `-${removes}` : ""}`;
    return text.trim();
  };

  return (
    <>
      <div className={clsx("flex items-center justify-end gap-8 bg-black px-8 py-3.5", className)} id="bottom-bar">
        <button className="w-50" onClick={() => setIsSettingsModalOpen(true)}>
          {t("common.settings")}
        </button>
        <button className="w-50" onClick={handleOnClickRefresh}>
          {t("common.refresh")}
        </button>

        <button className="w-50 overflow-hidden" onClick={handleApplyChanges}>
          {getApplyButtonText()}
        </button>
      </div>
      {isSettingsModalOpen &&
        createPortal(<SettingsModal onClose={() => setIsSettingsModalOpen(false)} />, document.body)}
    </>
  );
};

export default BottomBar;
