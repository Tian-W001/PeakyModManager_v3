import WallpaperPicker from "./components/WallpaperPicker";
import PathField from "./components/PathField";
import SelectTrigger from "@renderer/Modals/components/SelectTrigger";
import ModalOverlay from "@renderer/Modals/components/ModalOverlay";
import { useAppDispatch, useAppSelector } from "@renderer/redux/hooks";
import { useState } from "react";
import toast from "react-hot-toast";
import ZzzToast from "@renderer/components/zzzToast";
import {
  loadLibrary,
  selectD3dxUserPath,
  selectLibraryPath,
  selectTargetPath,
  setD3dxUserPath,
  setLibraryPath,
  setTargetPath,
} from "@renderer/redux/slices/librarySlice";
import {
  selectAllPresets,
  setPresets,
  selectCurrentPresetName,
  setCurrentPreset,
  clearDiffList,
} from "@renderer/redux/slices/presetsSlice";
import { useAlertModal } from "@renderer/hooks/useAlertModal";
import { useTranslation } from "react-i18next";
import ZzzSelect from "@renderer/components/zzzSelect";
import ZzzField from "@renderer/components/zzzField";
import ModalHeader from "@renderer/Modals/components/ModalHeader";
import ZzzButton from "@renderer/components/zzzButton";

const appVersion = await window.electron.ipcRenderer.invoke("get-app-version");

const SettingsModalContent = ({ onClose }: { onClose: () => void }) => {
  const dispatch = useAppDispatch();
  const libraryPath = useAppSelector(selectLibraryPath);
  const targetPath = useAppSelector(selectTargetPath);
  const d3dxUserPath = useAppSelector(selectD3dxUserPath);
  const presets = useAppSelector(selectAllPresets);
  const currentPresetName = useAppSelector(selectCurrentPresetName);
  const { showAlert, hideAlert, alert } = useAlertModal();
  const { t, i18n } = useTranslation();

  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  const handleCheckForUpdates = async () => {
    if (isCheckingUpdate) return;
    setIsCheckingUpdate(true);
    const toastId = toast.custom(() => <ZzzToast message={t("settings.checkingUpdate")} />, {
      id: "check-for-updates",
      duration: Infinity,
    });

    try {
      const updateAvailable: boolean | null = await window.electron.ipcRenderer.invoke("check-for-updates");
      const message =
        updateAvailable === null
          ? t("settings.updateCheckUnavailable")
          : updateAvailable
            ? t("settings.updateAvailable")
            : t("settings.upToDate");
      toast.custom(() => <ZzzToast message={message} />, { id: toastId, duration: 4000 });
    } catch {
      toast.custom(() => <ZzzToast message={t("settings.updateCheckFailed")} />, { id: toastId, duration: 4000 });
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleSelectLibraryPath = async () => {
    const newPath: string | null = await window.electron.ipcRenderer.invoke("select-path");
    if (newPath) {
      if (newPath === targetPath) {
        toast.custom(() => <ZzzToast message={t("settings.samePathError")} />);
        return;
      }
      await dispatch(setLibraryPath(newPath));
      await dispatch(loadLibrary());
      await window.electron.ipcRenderer.invoke("clear-target-path");
      dispatch(setPresets({})); // Clear presets when library path changes
      dispatch(clearDiffList());
      // user will need to restore presets manually
    }
  };

  const handleSelectTargetPath = async () => {
    const newPath: string | null = await window.electron.ipcRenderer.invoke("select-path");
    if (newPath) {
      if (newPath === libraryPath) {
        toast.custom(() => <ZzzToast message={t("settings.samePathError")} />);
        return;
      }
      await dispatch(setTargetPath(newPath));
      await window.electron.ipcRenderer.invoke("clear-target-path");
      dispatch(clearDiffList());
      dispatch(setCurrentPreset(currentPresetName)); // move current active mods in preset to diffList
    }
  };

  const handleSelectD3dxUserPath = async () => {
    const newPath: string | null = await window.electron.ipcRenderer.invoke("select-file");
    if (newPath) {
      await dispatch(setD3dxUserPath(newPath));
    }
  };

  const handleBackupPresets = async () => {
    const success = await window.electron.ipcRenderer.invoke("backup-presets", presets);
    if (success) {
      showAlert(
        t("settings.backupSuccess"),
        undefined,
        <ZzzButton type="Ok" onClick={hideAlert}>
          {t("common.confirm")}
        </ZzzButton>
      );
    } else {
      showAlert(
        t("settings.backupFail"),
        undefined,
        <ZzzButton type="Ok" onClick={hideAlert}>
          {t("common.confirm")}
        </ZzzButton>
      );
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
    const backupFilePath: string | null = await window.electron.ipcRenderer.invoke("select-backup-file");
    if (!backupFilePath) return;

    const restoreData = async () => {
      const backupPresets: Record<string, string[]> | null = await window.electron.ipcRenderer.invoke(
        "restore-presets",
        backupFilePath
      );
      if (backupPresets) {
        dispatch(setPresets(backupPresets));
        await window.electron.ipcRenderer.invoke("clear-target-path");
        dispatch(setCurrentPreset(currentPresetName)); // This will transform current preset mods to diffList
        return true;
      } else {
        return false;
      }
    };

    showAlert(
      t("settings.restoreConfirm"),
      t("settings.restoreConfirmMsg"),
      <>
        <ZzzButton type="Cancel" onClick={hideAlert}>
          {t("common.cancel")}
        </ZzzButton>
        <ZzzButton
          type="Ok"
          onClick={async () => {
            const success = await restoreData();
            hideAlert();
            if (success) {
              showAlert(
                t("settings.restoreSuccess"),
                undefined,
                <ZzzButton type="Ok" onClick={hideAlert}>
                  {t("common.confirm")}
                </ZzzButton>
              );
            } else {
              showAlert(
                t("settings.restoreFail"),
                undefined,
                <ZzzButton type="Info" onClick={hideAlert}>
                  {t("common.confirm")}
                </ZzzButton>
              );
            }
          }}
        >
          {t("common.confirm")}
        </ZzzButton>
      </>
    );
  };

  return (
    <>
      <div
        className={
          "chess-background flex size-[70%] flex-col overflow-hidden rounded-2xl rounded-tr-md border-4 border-black bg-[#333] inset-shadow-[1px_-1px_2px_#fff3,-1px_-1px_2px_#0009]"
        }
        id="modal-container"
      >
        <ModalHeader onClose={onClose} className="h-16">
          <p className="text-2xl font-bold text-white italic">{t("settings.title")}</p>
        </ModalHeader>

        <div className="no-scrollbar flex flex-1 flex-col gap-4 overflow-y-scroll p-6" id="info-container">
          <ZzzField
            title={t("settings.language")}
            content={
              <ZzzSelect
                value={i18n.language}
                onChange={(val) => {
                  i18n.changeLanguage(val);
                  localStorage.setItem("app_lang", val);
                }}
                options={[
                  { value: "en", label: "English" },
                  { value: "zh", label: "中文" },
                ]}
                renderTrigger={(props) => <SelectTrigger {...props} />}
              />
            }
          />

          {/* Library Path */}
          <PathField
            label={t("settings.libraryPath")}
            value={libraryPath}
            placeholder={t("settings.clickToSetPath")}
            onClick={handleSelectLibraryPath}
          />

          {/* Target Path */}
          <PathField
            label={t("settings.targetPath")}
            value={targetPath}
            placeholder={t("settings.clickToSetPath")}
            onClick={handleSelectTargetPath}
          />

          {/* d3dx_user.ini Path */}
          <PathField
            label={t("settings.d3dxUserPath")}
            value={d3dxUserPath}
            placeholder={t("settings.clickToSetPath")}
            onClick={handleSelectD3dxUserPath}
          />

          {/* Backup Button */}
          <div className="flex flex-row items-center gap-4">
            <ZzzButton type="Save" onClick={handleBackupPresets}>
              {t("settings.backup")}
            </ZzzButton>
            <ZzzButton type="Refresh" onClick={handleRestorePresets}>
              {t("settings.restore")}
            </ZzzButton>
          </div>

          {/* Wallpaper Selection */}
          <WallpaperPicker />

          {/* App Version */}
          <div className="hover:text-zzzYellow flex flex-row items-center justify-between gap-4 rounded-full bg-black px-3 py-1 text-white shadow-[1px_1px_1px_#fff2]">
            <span className="truncate">{t("settings.appVersion")}</span>
            <button
              type="button"
              className="cursor-pointer truncate disabled:cursor-wait disabled:opacity-50"
              onClick={handleCheckForUpdates}
              disabled={isCheckingUpdate}
            >
              {appVersion}
            </button>
          </div>
        </div>
      </div>

      {alert}
    </>
  );
};

const SettingsModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
  <ModalOverlay isOpen={isOpen}>
    <SettingsModalContent onClose={onClose} />
  </ModalOverlay>
);

export default SettingsModal;
