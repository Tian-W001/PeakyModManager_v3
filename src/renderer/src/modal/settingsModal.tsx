import { useAppDispatch, useAppSelector } from "@renderer/redux/hooks";
import {
  loadLibrary,
  selectLibraryPath,
  selectTargetPath,
  setLibraryPath,
  setTargetPath,
} from "@renderer/redux/slices/librarySlice";
import { FaTimes } from "react-icons/fa";
import {
  selectAllPresets,
  setPresets,
  selectCurrentPresetName,
  setCurrentPreset,
} from "@renderer/redux/slices/presetsSlice";
import { useAlertModal } from "../hooks/useAlertModal";
import { useTranslation } from "react-i18next";
import ZzzSelect from "@renderer/components/zzzSelect";

const SettingsModal = ({ onClose }: { onClose: () => void }) => {
  const dispatch = useAppDispatch();
  const libraryPath = useAppSelector(selectLibraryPath);
  const targetPath = useAppSelector(selectTargetPath);
  const presets = useAppSelector(selectAllPresets);
  const currentPresetName = useAppSelector(selectCurrentPresetName);
  const { showAlert, hideAlert, RenderAlert } = useAlertModal();
  const { t, i18n } = useTranslation();

  const handleSelectLibraryPath = async () => {
    const newPath: string | null = await window.electron.ipcRenderer.invoke("select-path");
    if (newPath) {
      await dispatch(setLibraryPath(newPath));
      console.log("load library from new path:", newPath);
      await dispatch(loadLibrary());
      await window.electron.ipcRenderer.invoke("clear-target-path");
      dispatch(setPresets({})); // Clear presets when library path changes
      // user will need to restore presets manually
    }
  };

  const handleSelectTargetPath = async () => {
    const newPath: string | null = await window.electron.ipcRenderer.invoke("select-path");
    if (newPath) {
      await dispatch(setTargetPath(newPath));
      // Clear target path, then move current active mods in preset to diffList
      await window.electron.ipcRenderer.invoke("clear-target-path");
      dispatch(setCurrentPreset(currentPresetName));
    }
  };

  const handleBackupPresets = async () => {
    const success = await window.electron.ipcRenderer.invoke("backup-presets", presets);
    if (success) {
      showAlert(t("settings.backupSuccess"), undefined, [{ name: t("common.confirm"), f: hideAlert }]);
    } else {
      showAlert(t("settings.backupFail"), undefined, [{ name: t("common.confirm"), f: hideAlert }]);
    }
  };

  const handleRestorePresets = async () => {
    /*
      When user switches to different preset, that preset infos will be temporarily loaded to diffList,
      so that user will manually apply the changes back to the preset.
      Therefore, when restoring presets from backup, we need to:
      1. Clear current diffList
      2. load all presets from backup
      3. remove current preset mods and put in diffList (done in setCurrentPreset action)
    */
    const restoreData = async () => {
      const backupPresets: Record<string, string[]> | null =
        await window.electron.ipcRenderer.invoke("restore-presets");
      if (backupPresets) {
        dispatch(setPresets(backupPresets));
        await window.electron.ipcRenderer.invoke("clear-target-path");
        dispatch(setCurrentPreset(currentPresetName)); // This will transform current preset mods to diffList
        return true;
      } else {
        return false;
      }
    };

    showAlert(t("settings.restoreConfirm"), undefined, [
      { name: t("common.cancel"), f: hideAlert },
      {
        name: t("common.confirm"),
        f: async () => {
          const success = await restoreData();
          hideAlert();

          if (success) {
            showAlert(t("settings.restoreSuccess"), undefined, [{ name: t("common.confirm"), f: hideAlert }]);
          } else {
            showAlert(t("settings.restoreFail"), undefined, [{ name: t("common.confirm"), f: hideAlert }]);
          }
        },
      },
    ]);
  };

  const handleOnClickTestButton = () => {
    showAlert(t("settings.testAlert"), t("settings.testAlertMessage"), [{ name: t("common.confirm"), f: hideAlert }]);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex size-full items-center justify-center bg-black/50" id="modal-overlay">
        <div className="flex h-[70%] w-[70%] flex-col overflow-hidden rounded-2xl border-2 border-black bg-white">
          <div className="flex items-center justify-between bg-gray-300 p-4">
            <h2 className="text-xl font-bold">{t("settings.title")}</h2>
            <button onClick={onClose} className="font-bold text-red-600 hover:text-red-800">
              <FaTimes size={24} />
            </button>
          </div>

          <div className="flex flex-col gap-4 p-6">
            <ZzzSelect
              label={t("settings.language")}
              value={i18n.language}
              onChange={(val) => {
                i18n.changeLanguage(val);
                localStorage.setItem("app_lang", val);
              }}
              options={[
                { value: "en", label: "English" },
                { value: "zh", label: "中文" },
              ]}
              className="px-3 py-1"
            />
            {/* Library Path */}
            <div className="flex flex-row items-center justify-between gap-4 rounded-full bg-black px-3 py-1 font-bold text-white">
              <span className="whitespace-nowrap">{t("settings.libraryPath")}</span>
              <input
                className="hover:text-zzzYellow flex-1 cursor-pointer bg-transparent text-right font-bold text-white outline-none"
                value={libraryPath || t("settings.clickToSetPath")}
                readOnly
                onClick={handleSelectLibraryPath}
              />
            </div>

            {/* Target Path */}
            <div className="flex flex-row items-center justify-between gap-4 rounded-full bg-black px-3 py-1 font-bold text-white">
              <span className="whitespace-nowrap">{t("settings.targetPath")}</span>
              <input
                className="hover:text-zzzYellow flex-1 cursor-pointer bg-transparent text-right font-bold text-white outline-none"
                value={targetPath || t("settings.clickToSetPath")}
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
                {t("settings.backup")}
              </button>
              <button
                onClick={handleRestorePresets}
                className="iron-border bg-orange-600 px-4 py-2 text-white hover:bg-orange-700"
              >
                {t("settings.restore")}
              </button>
              <button
                onClick={handleOnClickTestButton}
                className="iron-border bg-green-600 px-4 py-2 text-white hover:bg-green-700"
              >
                {t("settings.testAlert")}
              </button>
              <span className="text-sm text-gray-600">{t("settings.backupTooltip")}</span>
            </div>
          </div>
        </div>
      </div>
      <RenderAlert />
    </>
  );
};

export default SettingsModal;
