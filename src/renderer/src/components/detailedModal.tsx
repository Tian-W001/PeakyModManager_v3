import { useState } from "react";
import { useAppDispatch } from "@renderer/redux/hooks";
import { editModInfo } from "@renderer/redux/slices/librarySlice";
import { ModInfo } from "src/types/modInfo";

const DetailedModal = ({ modInfo, onClose }: { modInfo: ModInfo; onClose: () => void }) => {
  const dispatch = useAppDispatch();
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
    window.electron.ipcRenderer.invoke("open-mod-folder", modInfo.path);
  };

  return (
    <div className="fixed flex h-full w-full items-center justify-center bg-black/50">
      <div className="rounded bg-white p-4">
        <h1>{modInfo.name}</h1>
        <input
          type="text"
          value={localModInfo.description}
          className="mt-2 w-full border"
          onChange={(e) => handleModInfoChange("description", e.target.value)}
          onBlur={() => handleModInfoBlur("description")}
        />
        <button onClick={handleOpenModFolder}>
          Open Mod Folder
        </button>
        <button onClick={onClose} className="mt-4 rounded bg-gray-200 p-2">
          Close
        </button>
      </div>
    </div>
  );
};

export default DetailedModal;
