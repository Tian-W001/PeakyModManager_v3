import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@renderer/redux/hooks";
import { editModInfo, selectLibraryPath } from "@renderer/redux/slices/librarySlice";
import { ModInfo } from "@shared/modInfo";
import { modTypeList } from "@shared/modType";
import defaultCover from "@renderer/assets/default_cover.jpg";
import { characterNameList } from "@shared/character";

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
    window.electron.ipcRenderer.invoke("open-mod-folder", modInfo.name);
  };

  const handleSetCover = async () => {
    const imagePath = await window.electron.ipcRenderer.invoke("select-cover", modInfo.name);
    if (imagePath) {
      const newCoverName = await window.electron.ipcRenderer.invoke("import-mod-cover", modInfo.name, imagePath);
      if (newCoverName) {
        handleModInfoChange("coverImage", newCoverName);
        dispatch(editModInfo({ modName: modInfo.name, newModInfo: { coverImage: newCoverName } }));
      }
    }
  };

  const handleRemoveCover = async () => {
    handleModInfoChange("coverImage", "");
    dispatch(editModInfo({ modName: modInfo.name, newModInfo: { coverImage: "" } }));
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      e.preventDefault();
      const item = e.dataTransfer.items[0];
      // Check if it is an image
      if (item.kind !== "file" || !item.webkitGetAsEntry()?.isFile) {
        console.log("Not a file");
        return;
      }
      const file = item.getAsFile() as File;
      if (!file.type.startsWith("image/")) {
        console.log("Not an image file");
        return;
      }
      console.log("Dropped file:", file);
      const imagePath = window.api.getFilePath(file);
      console.log("Dropped image path:", imagePath);

      if (imagePath) {
        const newCoverName = await window.electron.ipcRenderer.invoke("import-mod-cover", modInfo.name, imagePath);
        if (newCoverName) {
          handleModInfoChange("coverImage", newCoverName);
          dispatch(editModInfo({ modName: modInfo.name, newModInfo: { coverImage: newCoverName } }));
        }
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="fixed inset-0 z-50 flex size-full items-center justify-center bg-black/50" id="modal-overlay">
      <div
        className="flex size-[80%] flex-row overflow-auto rounded-2xl border-2 border-black bg-white"
        id="modal-container"
      >
        <div
          className="group relative h-full w-[40%] bg-gray-200"
          id="left-section"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <img
            src={`mod-image://${modInfo.name}/${localModInfo.coverImage}`}
            alt="Cover"
            className="h-full w-full object-cover transition-all duration-300 group-hover:blur"
            onError={(e) => (e.currentTarget.src = defaultCover)}
          />
          <div className="absolute inset-0 hidden flex-col items-center justify-center gap-4 group-hover:flex">
            {localModInfo.coverImage ? (
              <>
                <button
                  onClick={handleRemoveCover}
                  className="rounded bg-red-600 px-4 py-2 font-bold text-white hover:bg-red-700"
                >
                  Remove Cover
                </button>
                <button
                  onClick={handleSetCover}
                  className="rounded bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-700"
                >
                  Change Cover
                </button>
              </>
            ) : (
              <button
                onClick={handleSetCover}
                className="rounded bg-green-600 px-4 py-2 font-bold text-white hover:bg-green-700"
              >
                Set Cover
              </button>
            )}
          </div>
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
            <select
              className="mt-2 w-full rounded-full border bg-black px-2 py-1 font-bold text-white"
              value={localModInfo.character}
              onChange={(e) => handleModInfoChange("character", e.target.value)}
            >
              {characterNameList.map((character) => (
                <option key={character} value={character}>
                  {character}
                </option>
              ))}
            </select>
            <div
              className="flex flex-row items-center justify-between gap-4 rounded-full bg-black px-3.5 py-1 font-bold text-white"
              id="mod-source"
            >
              <span className="">Source</span>
              <input
                className="flex-1 text-right font-bold text-white"
                value={localModInfo.source || "Unknown Source"}
                onChange={(e) => handleModInfoChange("source", e.target.value)}
                onBlur={() => handleModInfoBlur("source")}
              />
            </div>
          </div>
          <div
            className="relative bottom-0 flex h-auto w-full flex-row items-center justify-around gap-8 p-4 *:flex-1"
            id="bottom-buttons-section"
          >
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
