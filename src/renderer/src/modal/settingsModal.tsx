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
import { selectAllPresets, restorePresets, selectModNamesInCurrentPreset } from "@renderer/redux/slices/presetsSlice";
import { useAlertModal } from "../hooks/useAlertModal";
import { useTranslation } from "react-i18next";

const SettingsModal = ({ onClose }: { onClose: () => void }) => {
  const dispatch = useAppDispatch();
  const libraryPath = useAppSelector(selectLibraryPath);
  const targetPath = useAppSelector(selectTargetPath);
  const modInfos = useAppSelector(selectModInfos);
  const presets = useAppSelector(selectAllPresets);
  const currentPresetMods = useAppSelector(selectModNamesInCurrentPreset);
  const { showAlert, hideAlert, RenderAlert } = useAlertModal();
  const { t, i18n } = useTranslation();

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
      backupData.Presets[preset.name] = presetMods;
    });
    const success = await window.electron.ipcRenderer.invoke("backup-presets", backupData);
    if (success) {
      showAlert(t("settings.backupSuccess"), undefined, [{ name: t("common.confirm"), f: hideAlert }]);
    } else {
      showAlert(t("settings.backupFail"), undefined, [{ name: t("common.confirm"), f: hideAlert }]);
    }
  };

  const handleRestorePresets = async () => {
    const restoreData = async () => {
      const backupData = await window.electron.ipcRenderer.invoke("restore-presets");
      if (backupData) {
        dispatch(restorePresets(backupData));
      }
    };

    const applyRestore = async () => {
      await window.electron.ipcRenderer.invoke("clear-target-path");
      const changes = currentPresetMods.map((modName) => ({
        modName,
        enable: true,
      }));
      await window.electron.ipcRenderer.invoke("apply-mods", changes);
    };

    showAlert(t("settings.restoreConfirm"), undefined, [
      { name: t("common.cancel"), f: hideAlert },
      {
        name: t("common.confirm"),
        f: async () => {
          await restoreData();
          await applyRestore();
          hideAlert();

          showAlert(t("settings.restoreSuccess"), undefined, [{ name: t("common.confirm"), f: hideAlert }]);
        },
      },
    ]);
  };

  const handleOnClickTestButton = () => {
    showAlert(t("settings.testAlert"), t("settings.testAlertMessage"), [{ name: t("common.confirm"), f: hideAlert }]);
  };

  const handleSwitchLanguage = () => {
    const newLang = i18n.language === "en" ? "zh" : "en";
    i18n.changeLanguage(newLang);
    localStorage.setItem("app_lang", newLang);
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
            {/* Library Path */}
            <div className="flex flex-row items-center justify-between gap-4 rounded-full bg-black px-4 py-2 font-bold text-white">
              <span className="whitespace-nowrap">{t("settings.libraryPath")}</span>
              <input
                className="hover:text-zzzYellow flex-1 cursor-pointer bg-transparent text-right font-bold text-white outline-none"
                value={libraryPath || t("settings.clickToSetPath")}
                readOnly
                onClick={handleSelectLibraryPath}
              />
            </div>

            {/* Target Path */}
            <div className="flex flex-row items-center justify-between gap-4 rounded-full bg-black px-4 py-2 font-bold text-white">
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

            {/* Language Switch */}
            <div className="flex flex-row items-center gap-4">
              <button onClick={handleSwitchLanguage} className="w-30">
                {i18n.language === "en" ? "English" : "中文"}
              </button>
            </div>
          </div>
        </div>
      </div>
      <RenderAlert />
    </>
  );
};

export default SettingsModal;
