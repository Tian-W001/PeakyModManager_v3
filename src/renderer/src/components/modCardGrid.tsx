import { ModInfo } from "src/shared/modInfo";
import ModCard from "./modCard";
import clsx from "clsx";
import { useState } from "react";
import { FaPlus } from "react-icons/fa";
import { useAppDispatch, useAppSelector } from "@renderer/redux/hooks";
import { selectAllPresetNames, selectCurrentPresetName, setCurrentPreset } from "@renderer/redux/slices/presetsSlice";
import { createPortal } from "react-dom";
import EditPresetsModal from "../modal/editPresetsModal";
import { addModInfo } from "@renderer/redux/slices/librarySlice";
import { setSelectedMenuItem } from "@renderer/redux/slices/uiSlice";
import { FaCaretUp } from "react-icons/fa6";

const ModCardGrid = ({ modInfos, className }: { modInfos: ModInfo[]; className?: string }) => {
  const dispatch = useAppDispatch();
  const currentPresetName = useAppSelector(selectCurrentPresetName);
  const allPresetNames = useAppSelector(selectAllPresetNames);
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

  return (
    <div className={clsx("relative h-full", className)} onDrop={handleDrop} onDragOver={handleDragOver}>
      <div className="flex h-full w-full flex-wrap items-start justify-start gap-8 overflow-x-hidden overflow-y-auto p-4 [scrollbar-color:#fff_#0000] [scrollbar-gutter:stable]">
        {modInfos.map((modInfo) => (
          <ModCard key={modInfo.name} modInfo={modInfo} />
        ))}
      </div>

      <div className="absolute right-8 bottom-4 flex flex-col items-end">
        {isDropdownOpen && (
          <div className="mb-2 flex flex-col gap-1 rounded border border-gray-700 bg-black p-2 text-white shadow-lg">
            {allPresetNames.map((name) => (
              <button
                key={name}
                className={clsx("", name === currentPresetName && "text-zzzYellow")}
                onClick={async () => {
                  await window.electron.ipcRenderer.invoke("clear-target-path");
                  dispatch(setCurrentPreset(name));
                  setIsDropdownOpen(false);
                }}
              >
                {name}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <button className="" onClick={() => setIsEditPresetsModalOpen(true)}>
            <FaPlus />
          </button>
          <button className="flex items-center justify-around gap-2" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
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
  );
};

export default ModCardGrid;
