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

  const handleOpenModFolder = () => {
    if (!libraryPath) return;
    window.electron.ipcRenderer.invoke("open-mod-folder", path.join(libraryPath, modInfo.name));
  };

  console.log("image src:", `mod-image://local/${libraryPath}/${modInfo.name}/${modInfo.coverImage}`);

  return (
    <div className="fixed inset-0 z-50 flex size-full items-center justify-center bg-black/50" id="modal-overlay">
      <div className="flex size-[80%] flex-row overflow-auto rounded-2xl bg-white" id="modal-container">
        <div className={`h-full w-[40%] bg-gray-200`} id="left-section">
          <img
            src={`mod-image://local/${libraryPath}/${modInfo.name}/${modInfo.coverImage}`}
            alt="Cover"
            className="h-full w-full object-cover"
            onError={(e) => (e.currentTarget.src = defaultCover)}
          />
        </div>
        <div className="h-full flex-1 p-4" id="right-section">
          <h1>{modInfo.name}</h1>

          <span className="mt-2 block font-bold">Description:</span>
          <input
            type="text"
            value={localModInfo.description}
            className="mt-2 w-full border"
            onChange={(e) => handleModInfoChange("description", e.target.value)}
            onBlur={() => handleModInfoBlur("description")}
          />
          <span className="mt-2 block font-bold">Mod Type:</span>
          <select className="mt-2 w-full border" value={localModInfo.modType} onChange={(e) => handleModInfoChange("modType", e.target.value)}>
            {modTypeList.map((modType) => (
              <option key={modType} value={modType}>
                {modType}
              </option>
            ))}
          </select>
          <button onClick={handleOpenModFolder} className="mt-4 rounded bg-gray-200 p-2">
            Open Mod Folder
          </button>
          <button onClick={onClose} className="mt-4 rounded bg-gray-200 p-2">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DetailedModal;
