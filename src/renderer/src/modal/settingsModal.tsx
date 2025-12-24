import { useAppDispatch, useAppSelector } from "@renderer/redux/hooks";
import { useEffect, useRef } from "react";
import IconInfo from "@renderer/assets/icons/Info.png";
import toast from "react-hot-toast";
import ZzzToast from "@renderer/components/zzzToast";
import {
  loadLibrary,
  selectLibraryPath,
  selectTargetPath,
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
import { selectCurrentWallpaper, setCurrentWallpaper } from "@renderer/redux/slices/uiSlice";
import { useAlertModal } from "../hooks/useAlertModal";
import { useTranslation } from "react-i18next";
import ZzzSelect from "@renderer/components/zzzSelect";
import Exit from "@renderer/components/Exit";
import IconHookBig from "@renderer/assets/icons/HookBig.png";
import ZzzButton from "@renderer/components/zzzButton";
import Locate from "@renderer/assets/icons/Locate.png";

const wallpapers = import.meta.glob("@renderer/assets/wallpapers/*", { eager: true, query: "?url", import: "default" });

const appVersion = await window.electron.ipcRenderer.invoke("get-app-version");

const SettingsModal = ({ onClose }: { onClose: () => void }) => {
  const dispatch = useAppDispatch();
  const libraryPath = useAppSelector(selectLibraryPath);
  const targetPath = useAppSelector(selectTargetPath);
  const presets = useAppSelector(selectAllPresets);
  const currentPresetName = useAppSelector(selectCurrentPresetName);
  const currentWallpaper = useAppSelector(selectCurrentWallpaper);
  const { showAlert, hideAlert, RenderAlert } = useAlertModal();
  const { t, i18n } = useTranslation();

  const handleSaveWallpaper = (selectedWallpaper: string) => {
    dispatch(setCurrentWallpaper(selectedWallpaper));
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

    showAlert(
      t("settings.restoreConfirm"),
      undefined,
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

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      const handleWheel = (e: WheelEvent) => {
        if (e.deltaY !== 0) {
          e.preventDefault();
          container.scrollLeft += e.deltaY;
        }
      };
      container.addEventListener("wheel", handleWheel, { passive: false });
      return () => {
        container.removeEventListener("wheel", handleWheel);
      };
    }
    return;
  }, []);

  const handleOpenLibraryFolder = () => {
    if (libraryPath) {
      window.electron.ipcRenderer.invoke("open-mod-folder");
    }
  };

  const handleOpenTargetFolder = () => {
    if (targetPath) {
      window.electron.ipcRenderer.invoke("open-target-folder");
    }
  };

  return (
    <>
      <div className="modal-overlay" id="modal-overlay">
        <div
          className="chess-background flex size-[70%] flex-col overflow-hidden rounded-2xl border-4 border-black bg-[#333] inset-shadow-[1px_-1px_2px_#fff3,-1px_-1px_2px_#0009]"
          id="modal-container"
        >
          <div className="flex h-16 items-center justify-between bg-black/20 px-4 py-2" id="modal-header">
            <div className="title-decorator flex min-w-0 items-center gap-2" id="title-wrapper">
              <p className="text-2xl font-bold text-white italic">{t("settings.title")}</p>
            </div>
            <Exit
              className="hover:fill-zzzYellow shrink-0 fill-[#c42209] transition-all hover:scale-110"
              onClick={onClose}
            />
          </div>

          <div className="no-scrollbar flex flex-1 flex-col gap-4 overflow-y-scroll p-6" id="info-container">
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
              className="px-3 py-1 shadow-[1px_1px_1px_#fff2]"
            />

            {/* Library Path */}
            <div className="hover:text-zzzYellow relative flex cursor-pointer flex-row items-center justify-between gap-4 rounded-full bg-black px-3 py-1 text-white shadow-[1px_1px_1px_#fff2]">
              <span className="truncate">{t("settings.libraryPath")}</span>
              <input
                className="mr-6 flex-1 cursor-[inherit] text-right outline-none"
                value={libraryPath || t("settings.clickToSetPath")}
                readOnly
                onClick={handleSelectLibraryPath}
              />
              <img
                src={Locate}
                alt="Locate"
                onClick={handleOpenLibraryFolder}
                className="absolute right-2 h-6 cursor-pointer"
              />
            </div>

            {/* Target Path */}
            <div className="hover:text-zzzYellow relative flex cursor-pointer flex-row items-center justify-between gap-4 rounded-full bg-black px-3 py-1 text-white shadow-[1px_1px_1px_#fff2]">
              <span className="truncate">{t("settings.targetPath")}</span>
              <input
                className="mr-6 flex-1 cursor-[inherit] text-right outline-none"
                value={targetPath || t("settings.clickToSetPath")}
                readOnly
                onClick={handleSelectTargetPath}
              />
              <img
                src={Locate}
                alt="Locate"
                onClick={handleOpenTargetFolder}
                className="absolute right-2 h-6 cursor-pointer"
              />
            </div>

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
            <div className="flex flex-col gap-1">
              <div
                ref={scrollContainerRef}
                className="no-scrollbar flex flex-row items-center gap-2 overflow-x-scroll rounded-3xl border-8 bg-black shadow-[1px_1px_1px_#fff2]"
              >
                {Object.entries(wallpapers).map(([path, url]) => {
                  const filename = path.split("/").pop() || "";
                  const isCurrent = currentWallpaper === filename;
                  return (
                    <div
                      key={path}
                      className={`hover:border-zzzYellow relative aspect-video w-48 shrink-0 cursor-pointer overflow-hidden rounded-2xl border-3 transition-all`}
                      onDoubleClick={() => handleSaveWallpaper(filename)}
                    >
                      <img src={url as string} alt={filename} className="size-full object-cover" />
                      {isCurrent && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <img src={IconHookBig} className="h-12 w-12" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="flex items-center gap-1 pl-3 text-sm text-[#999]">
                <img src={IconInfo} alt="Info" className="mr-1 inline-block h-4 w-4" />
                {t("settings.wallpaperTooltip")}
              </p>
            </div>

            {/* App Version */}
            <div className="hover:text-zzzYellow flex flex-row items-center justify-between gap-4 rounded-full bg-black px-3 py-1 text-white shadow-[1px_1px_1px_#fff2]">
              <span className="truncate">{t("settings.appVersion")}</span>
              <span className="truncate">{appVersion}</span>
            </div>
          </div>
        </div>
      </div>
      <RenderAlert />
    </>
  );
};

export default SettingsModal;
