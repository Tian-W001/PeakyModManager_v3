import { useAppDispatch, useAppSelector } from "@renderer/redux/hooks";
import {
  loadLibrary,
  selectLibraryPath,
  selectTargetPath,
  setLibraryPath,
  setTargetPath,
} from "@renderer/redux/slices/librarySlice";
import { FaTimes } from "react-icons/fa";

const SettingsModal = ({ onClose }: { onClose: () => void }) => {
  const dispatch = useAppDispatch();
  const libraryPath = useAppSelector(selectLibraryPath);
  const targetPath = useAppSelector(selectTargetPath);

  const handleSelectLibraryPath = async () => {
    const newPath: string | null = await window.electron.ipcRenderer.invoke("select-path");
    if (newPath) {
      dispatch(setLibraryPath(newPath));
      dispatch(loadLibrary(newPath));
    }
  };

  const handleSelectTargetPath = async () => {
    const newPath: string | null = await window.electron.ipcRenderer.invoke("select-path");
    if (newPath) {
      dispatch(setTargetPath(newPath));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex size-full items-center justify-center bg-black/50" id="modal-overlay">
      <div className="flex w-[50%] flex-col overflow-hidden rounded-2xl border-2 border-black bg-white">
        <div className="flex items-center justify-between bg-gray-300 p-4">
          <h2 className="text-xl font-bold">Settings</h2>
          <button onClick={onClose} className="font-bold text-red-600 hover:text-red-800">
            <FaTimes size={24} />
          </button>
        </div>

        <div className="flex flex-col gap-4 p-6">
          {/* Library Path */}
          <div className="flex flex-row items-center justify-between gap-4 rounded-full bg-black px-4 py-2 font-bold text-white">
            <span className="whitespace-nowrap">Library Path</span>
            <input
              className="hover:text-zzzYellow flex-1 cursor-pointer bg-transparent text-right font-bold text-white outline-none"
              value={libraryPath || "Click to set path"}
              readOnly
              onClick={handleSelectLibraryPath}
            />
          </div>

          {/* Target Path */}
          <div className="flex flex-row items-center justify-between gap-4 rounded-full bg-black px-4 py-2 font-bold text-white">
            <span className="whitespace-nowrap">Target Path</span>
            <input
              className="hover:text-zzzYellow flex-1 cursor-pointer bg-transparent text-right font-bold text-white outline-none"
              value={targetPath || "Click to set path"}
              readOnly
              onClick={handleSelectTargetPath}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
