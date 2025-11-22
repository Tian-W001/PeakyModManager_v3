import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@renderer/redux/hooks";
import { editModInfo, selectLibraryPath } from "@renderer/redux/slices/librarySlice";
import { ModInfo } from "@shared/modInfo";
import { modTypeList } from "@shared/modType";
import path from "path-browserify";
import defaultCover from "@renderer/assets/default_cover.jpg";

const DetailedModal = ({ modInfo, onClose }: { modInfo: ModInfo; onClose: () => void }) => {
  const dispatch = useAppDispatch();
  const libraryPath = useAppSelector(selectLibraryPath);
  const [localModInfo, setLocalModInfo] = useState<ModInfo>(modInfo);

  const handleModInfoChange = (field: keyof ModInfo, value: string) => {
    setLocalModInfo((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleModInfoBlur = (field: keyof ModInfo) => {
    dispatch(
      editModInfo({
        modName: modInfo.name,
        newModInfo: {
          [field]: localModInfo[field],
        },
      })
    );
  };

  const saveModInfoChanges = () => {
    dispatch(
      editModInfo({
        modName: modInfo.name,
        newModInfo: localModInfo,
      })
    );
    onClose();
  };

  const handleOpenModFolder = () => {
    if (!libraryPath) return;
    window.electron.ipcRenderer.invoke("open-mod-folder", path.join(libraryPath, modInfo.name));
  };

  console.log("image src:", `mod-image://local/${libraryPath}/${modInfo.name}/${modInfo.coverImage}`);

  return (
    <div className="fixed inset-0 z-50 flex size-full items-center justify-center bg-black/50" id="modal-overlay">
      <div className="flex size-[80%] flex-row overflow-auto rounded-2xl border-2 border-black bg-white" id="modal-container">
        <div className={`h-full w-[40%] bg-gray-200`} id="left-section">
          <img
            src={`mod-image://local/${libraryPath}/${modInfo.name}/${modInfo.coverImage}`}
            alt="Cover"
            className="h-full w-full object-cover"
            onError={(e) => (e.currentTarget.src = defaultCover)}
          />
        </div>
        <div className="flex h-full flex-1 flex-col justify-between gap-2 bg-gray-300" id="right-section">
          <h1>{modInfo.name}</h1>
          <div className="flex flex-1 flex-col gap-2 overflow-auto p-4" id="mod-info-section">
            <input
              type="text"
              value={localModInfo.description}
              placeholder="Description"
              className="min-h-20 w-full rounded-2xl border bg-black font-bold text-white"
              onChange={(e) => handleModInfoChange("description", e.target.value)}
              onBlur={() => handleModInfoBlur("description")}
            />
            <select
              className="mt-2 w-full rounded-full border bg-black px-2 py-1 font-bold text-white"
              value={localModInfo.modType}
              onChange={(e) => handleModInfoChange("modType", e.target.value)}
            >
              {modTypeList.map((modType) => (
                <option key={modType} value={modType}>
                  {modType}
                </option>
              ))}
            </select>
            <div className="flex flex-row items-center justify-between gap-4 rounded-full bg-black px-3.5 py-1 font-bold text-white" id="mod-source">
              <span className="">Source</span>
              <input className="flex-1 text-right font-bold text-white" value={modInfo.source || "Unknown Source"} />
            </div>
          </div>
          <div className="relative bottom-0 flex h-auto w-full flex-row items-center justify-around gap-8 p-4 *:flex-1" id="bottom-buttons-section">
            <button onClick={handleOpenModFolder} className="iron-border chess-background">
              Open Mod Folder
            </button>
            <button onClick={onClose} className="iron-border chess-background">
              Close
            </button>
            <button onClick={saveModInfoChanges} className="iron-border chess-background">
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailedModal;
