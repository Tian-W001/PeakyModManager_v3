import { ModInfo } from "src/shared/modInfo";
import ModCard from "./modCard";
import clsx from "clsx";
import { useState } from "react";
import { FaPlus } from "react-icons/fa";
import { useAppDispatch, useAppSelector } from "@renderer/redux/hooks";
import {
  applyMods,
  clearDiffList,
  selectAllPresetNames,
  selectCurrentPresetName,
  selectDiffList,
  setCurrentPreset,
} from "@renderer/redux/slices/presetsSlice";
import { createPortal } from "react-dom";
import EditPresetsModal from "../modal/editPresetsModal";
import { addModInfo } from "@renderer/redux/slices/librarySlice";
import { setSelectedMenuItem } from "@renderer/redux/slices/uiSlice";
import { FaCaretUp } from "react-icons/fa6";
import { useAlertModal } from "@renderer/hooks/useAlertModal";
import { useTranslation } from "react-i18next";
import BangbooLoading from "@renderer/assets/bangboo_loading.gif";

const ModCardGrid = ({ modInfos, className }: { modInfos: ModInfo[]; className?: string }) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const currentPresetName = useAppSelector(selectCurrentPresetName);
  const allPresetNames = useAppSelector(selectAllPresetNames);
  const diffList = useAppSelector(selectDiffList);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isEditPresetsModalOpen, setIsEditPresetsModalOpen] = useState(false);

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.stopPropagation();

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      e.preventDefault();
      const item = e.dataTransfer.items[0];
      if (item.kind !== "file" || !item.webkitGetAsEntry()?.isDirectory) {
        console.log("not a folder");
        return;
      }
      const file = item.getAsFile() as File;
      const filePath = window.api.getFilePath(file);
      console.log("Dropped folder:", filePath);
      if (filePath) {
        const newModInfo = await window.electron.ipcRenderer.invoke("import-mod", filePath);
        console.log("Imported mod info:", newModInfo);
        if (newModInfo) {
          dispatch(addModInfo(newModInfo));
          dispatch(setSelectedMenuItem("Unknown"));
        }
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const { showAlert, hideAlert, RenderAlert } = useAlertModal();
  const handleSwitchPreset = async (name: string) => {
    const applyChanges = async () => {
      dispatch(applyMods(diffList));
      //no need to call ipc here, as this preset will be switched right after
      dispatch(clearDiffList());
    };
    const switchPreset = async () => {
      await window.electron.ipcRenderer.invoke("clear-target-path");
      dispatch(setCurrentPreset(name));
      setIsDropdownOpen(false);
      hideAlert();
    };
    // if diffList is not empty, show alert
    if (diffList && Object.keys(diffList).length > 0) {
      showAlert(t("presets.UnsavedChanges"), undefined, [
        { name: t("common.cancel"), f: hideAlert },
        { name: t("common.discard"), f: switchPreset },
        {
          name: t("common.apply"),
          f: async () => {
            await applyChanges();
            await switchPreset();
          },
        },
      ]);
      return;
    }
    await switchPreset();
  };

  return (
    <>
      <div className={clsx("relative h-full", className)} onDrop={handleDrop} onDragOver={handleDragOver}>
        <div className="flex h-full w-full flex-wrap items-start justify-start gap-8 overflow-x-hidden overflow-y-auto p-4 [scrollbar-color:#fff_#0000] [scrollbar-gutter:stable]">
          {modInfos.length === 0 ? (
            <div className="flex h-full w-full items-center justify-center">
              <img src={BangbooLoading} alt="Loading..." className="h-32 w-32 object-contain" />
            </div>
          ) : (
            modInfos.map((modInfo) => <ModCard key={modInfo.name} modInfo={modInfo} />)
          )}
        </div>

        <div className="absolute right-8 bottom-4 flex flex-col items-end">
          {isDropdownOpen && (
            <div className="mb-2 flex max-h-40 w-full flex-col gap-2 overflow-x-hidden overflow-y-auto rounded-2xl bg-[#222] p-2">
              {allPresetNames.map((name) => (
                <div
                  key={name}
                  className={clsx(
                    "hover:bg-zzzYellow flex h-10 cursor-pointer items-center justify-end overflow-hidden rounded-xl p-2 whitespace-nowrap text-white hover:text-black",
                    name === currentPresetName && "text-zzzYellow"
                  )}
                  onClick={async () => await handleSwitchPreset(name)}
                >
                  {name}
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <button className="zzzButton chess-background" onClick={() => setIsEditPresetsModalOpen(true)}>
              <FaPlus />
            </button>
            <button
              className="zzzButton chess-background flex items-center justify-around gap-2"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <span className="font-bold whitespace-nowrap">{currentPresetName}</span>
              <FaCaretUp
                className="transition-transform"
                style={{ transform: isDropdownOpen ? "rotate(180deg)" : "rotate(0deg)" }}
              />
            </button>
          </div>
        </div>
        {isEditPresetsModalOpen &&
          createPortal(<EditPresetsModal onClose={() => setIsEditPresetsModalOpen(false)} />, document.body)}
      </div>
      <RenderAlert />
    </>
  );
};

export default ModCardGrid;
