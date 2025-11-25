import { ModInfo } from "src/shared/modInfo";
import ModCard from "./modCard";
import clsx from "clsx";
import { useState } from "react";
import { FaAngleUp, FaPlus } from "react-icons/fa";
import { useAppDispatch, useAppSelector } from "@renderer/redux/hooks";
import { selectAllPresetNames, selectCurrentPresetName, setCurrentPreset } from "@renderer/redux/slices/presetsSlice";
import { createPortal } from "react-dom";
import EditPresetsModal from "../modal/editPresetsModal";
import { addModInfo } from "@renderer/redux/slices/librarySlice";
import { setSelectedMenuItem } from "@renderer/redux/slices/uiSlice";

const ModCardGrid = ({
  modInfos,
  diffList,
  appendToDiffList,
  className,
}: {
  modInfos: ModInfo[];
  diffList: { modName: string; enable: boolean }[];
  appendToDiffList: (modName: string, enable: boolean) => void;
  className?: string;
}) => {
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
          <ModCard key={modInfo.name} modInfo={modInfo} diffList={diffList} appendToDiffList={appendToDiffList} />
        ))}
      </div>

      <div className="absolute right-8 bottom-4 flex flex-col items-end">
        {isDropdownOpen && (
          <div className="mb-2 flex flex-col gap-1 rounded border border-gray-700 bg-black p-2 text-white shadow-lg">
            {allPresetNames.map((name) => (
              <button
                key={name}
                className={clsx(
                  "rounded px-4 py-1 text-left hover:bg-gray-700",
                  name === currentPresetName && "text-zzzYellow"
                )}
                onClick={() => {
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
          <button
            className="bg-zzzYellow flex size-10 items-center justify-center rounded-full text-black shadow-lg transition-colors hover:bg-yellow-400"
            onClick={() => setIsEditPresetsModalOpen(true)}
          >
            <FaPlus />
          </button>
          <button
            className="bg-zzzYellow flex items-center gap-2 rounded-full px-4 py-2 text-black shadow-lg transition-colors hover:bg-yellow-400"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <FaAngleUp className={clsx("transition-transform", isDropdownOpen && "rotate-180")} />
            <span className="font-bold">{currentPresetName}</span>
          </button>
        </div>
      </div>
      {isEditPresetsModalOpen &&
        createPortal(<EditPresetsModal onClose={() => setIsEditPresetsModalOpen(false)} />, document.body)}
    </div>
  );
};

export default ModCardGrid;
