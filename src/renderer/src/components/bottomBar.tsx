import { useAppDispatch, useAppSelector } from "@renderer/redux/hooks";
import { loadLibrary, selectLibraryPath } from "@renderer/redux/slices/librarySlice";
import { clsx } from "clsx";
import { useState } from "react";
import { createPortal } from "react-dom";
import SettingsModal from "../modal/settingsModal";
import { useTranslation } from "react-i18next";

const BottomBar = ({
  diffList,
  onApplyChanges,
  className,
}: {
  diffList: { modName: string; enable: boolean }[];
  onApplyChanges: () => void;
  className?: string;
}) => {
  const dispatch = useAppDispatch();
  const libraryPath = useAppSelector(selectLibraryPath);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const { t } = useTranslation();

  const handleOnClickRefresh = async () => {
    dispatch(loadLibrary(libraryPath));
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

        <button className="bg-zzzYellow w-50 rounded px-4 text-black" onClick={onApplyChanges}>
          {t("common.apply")} {diffList.length ? `(${diffList.length})` : ""}
        </button>
      </div>
      {isSettingsModalOpen &&
        createPortal(<SettingsModal onClose={() => setIsSettingsModalOpen(false)} />, document.body)}
    </>
  );
};

export default BottomBar;
