import { useAppDispatch, useAppSelector } from "@renderer/redux/hooks";
import {
  loadLibrary,
  selectLibraryPath,
  selectModInfos,
  selectTargetPath,
  setLibraryPath,
  setTargetPath,
} from "@renderer/redux/slices/librarySlice";
import { FaTimes } from "react-icons/fa";
import { selectAllPresets } from "@renderer/redux/slices/presetsSlice";
import { useAlertModal } from "../hooks/useAlertModal";

const SettingsModal = ({ onClose }: { onClose: () => void }) => {
  const dispatch = useAppDispatch();
  const libraryPath = useAppSelector(selectLibraryPath);
  const targetPath = useAppSelector(selectTargetPath);
  const modInfos = useAppSelector(selectModInfos);
  const presets = useAppSelector(selectAllPresets);
  const { showAlert, hideAlert, RenderAlert } = useAlertModal();

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

  const handleBackupPresets = async () => {
    const backupData = { Presets: {} };
    presets.forEach((preset) => {
      const presetMods: Record<string, boolean> = {};
      modInfos.forEach((mod) => {
        presetMods[mod.name] = preset.mods.includes(mod.name);
      });
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      backupData.Presets[preset.name] = presetMods;
    });
    const success = await window.electron.ipcRenderer.invoke("backup-presets", backupData);
    if (success) {
      showAlert("Presets backed up successfully!", undefined, [{ name: "Confirm", f: hideAlert }]);
    } else {
      showAlert("Failed to backup presets.", undefined, [{ name: "Confirm", f: hideAlert }]);
    }
  };

  const handleOnClickTestButton = () => {
    showAlert("Test Alert", "This is a test alert!", [{ name: "Confirm", f: hideAlert }]);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex size-full items-center justify-center bg-black/50" id="modal-overlay">
        <div className="flex h-[70%] w-[70%] flex-col overflow-hidden rounded-2xl border-2 border-black bg-white">
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

            {/* Backup Button */}
            <div className="flex flex-row items-center gap-4">
              <button
                onClick={handleBackupPresets}
                className="iron-border bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Backup
              </button>
              <button
                onClick={handleOnClickTestButton}
                className="iron-border bg-green-600 px-4 py-2 text-white hover:bg-green-700"
              >
                Test Alert
              </button>
              <span className="text-sm text-gray-600">Backup presets information into current Library dir</span>
            </div>
          </div>
        </div>
      </div>
      <RenderAlert />
    </>
  );
};

export default SettingsModal;
