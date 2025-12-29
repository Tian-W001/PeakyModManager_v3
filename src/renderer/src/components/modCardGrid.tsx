import { ModInfo } from "src/shared/modInfo";
import ModCard from "./modCard";
import ZzzButton from "./zzzButton";
import clsx from "clsx";
import { useEffect, useCallback, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@renderer/redux/hooks";
import {
  addToDiffList,
  applyMods,
  clearDiffList,
  selectAllPresetNames,
  selectCurrentPresetMods,
  selectCurrentPresetName,
  selectDiffList,
  setCurrentPreset,
} from "@renderer/redux/slices/presetsSlice";
import { createPortal } from "react-dom";
import EditPresetsModal from "../modal/editPresetsModal";
import { addModInfo } from "@renderer/redux/slices/librarySlice";
import { selectSelectedCharacter, selectSelectedMenuItem, setSelectedMenuItem } from "@renderer/redux/slices/uiSlice";
import { FaCaretUp } from "react-icons/fa6";
import { useAlertModal } from "@renderer/hooks/useAlertModal";
import { useTranslation } from "react-i18next";
import BangbooLoading from "@renderer/assets/bangboo_loading.gif";
import useMountTransition from "@renderer/hooks/useMountTransition";

const ModCardGrid = ({ modInfos, className }: { modInfos: ModInfo[]; className?: string }) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const currentPresetName = useAppSelector(selectCurrentPresetName);
  const allPresetNames = useAppSelector(selectAllPresetNames);
  const diffList = useAppSelector(selectDiffList);
  const currentPresetMods = useAppSelector(selectCurrentPresetMods);

  const [toggleMultiSelectMenu, shouldMultiSelectMenuMount, isMultiSelectMenuTransitioned] = useMountTransition(200);
  const [togglePresetsMenu, shouldPresetsMenuMount, isPresetsMenuTransitioned] = useMountTransition(200);
  const [togglePresetsModalOpen, shouldPresetsModalMount, isPresetsModalTransitioned] = useMountTransition(200);

  const ref = useRef<HTMLDivElement>(null);
  const selectedMenuItem = useAppSelector(selectSelectedMenuItem);
  const selectedCharacter = useAppSelector(selectSelectedCharacter);
  useEffect(() => {
    ref.current?.scrollTo(0, 0);
  }, [selectedMenuItem, selectedCharacter]);

  const importMod = useCallback(
    async (filePath: string) => {
      const newModInfo = (await window.electron.ipcRenderer.invoke("import-mod", filePath)) as ModInfo;
      console.log("Imported mod info:", newModInfo);
      if (newModInfo) {
        dispatch(addModInfo(newModInfo));
        dispatch(setSelectedMenuItem(newModInfo.modType ?? "Unknown"));
      }
    },
    [dispatch]
  );

  useEffect(() => {
    window.electron.ipcRenderer.on("import-mod", (_event, filePath) => {
      importMod(filePath);
    });
    return () => {
      window.electron.ipcRenderer.removeAllListeners("import-mod");
    };
  }, [importMod]);

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.stopPropagation();

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      e.preventDefault();
      const item = e.dataTransfer.items[0];
      if (item.kind !== "file" || !item.webkitGetAsEntry()?.isDirectory) {
        console.error(item, "not a folder");
        return;
      }
      const file = item.getAsFile() as File;
      const filePath = window.api.getFilePath(file);
      console.log("Dropped folder:", filePath);
      if (filePath) {
        await importMod(filePath);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleMultiSelect = (value: "selectAll" | "selectNone") => {
    dispatch(clearDiffList());
    if (value === "selectAll") {
      dispatch(
        addToDiffList(
          modInfos.reduce(
            (acc: Record<string, boolean>, mod) => {
              if (!currentPresetMods.includes(mod.name)) {
                acc[mod.name] = true;
              }
              return acc;
            },
            {} as Record<string, boolean>
          )
        )
      );
    } else if (value === "selectNone") {
      dispatch(
        addToDiffList(
          modInfos.reduce(
            (acc: Record<string, boolean>, mod) => {
              if (currentPresetMods.includes(mod.name)) {
                acc[mod.name] = false;
              }
              return acc;
            },
            {} as Record<string, boolean>
          )
        )
      );
    }
  };

  const { showAlert, hideAlert, RenderAlert } = useAlertModal();
  const handleSwitchPreset = async (name: string) => {
    const applyChanges = async () => {
      dispatch(applyMods(diffList));
      //no need to call ipc here, as this preset will be switched right after
      dispatch(clearDiffList());
    };
    const switchPreset = async () => {
      await window.electron.ipcRenderer.invoke("clear-target-path");
      dispatch(setCurrentPreset(name));
      togglePresetsMenu();
      hideAlert();
    };
    // if diffList is not empty, show alert
    if (diffList && Object.keys(diffList).length > 0) {
      showAlert(
        t("presets.UnsavedChanges"),
        undefined,
        <>
          <ZzzButton type="Cancel" onClick={hideAlert}>
            {t("common.cancel")}
          </ZzzButton>
          <ZzzButton type="FairyWarning" onClick={switchPreset}>
            {t("common.discard")}
          </ZzzButton>
          <ZzzButton
            type="Apply"
            onClick={async () => {
              await applyChanges();
              await switchPreset();
            }}
          >
            {t("presets.ApplyAndSwitch")}
          </ZzzButton>
        </>
      );
      return;
    }
    await switchPreset();
  };

  return (
    <>
      <div className={clsx("relative h-full", className)} onDrop={handleDrop} onDragOver={handleDragOver}>
        <div
          ref={ref}
          className="flex size-full flex-wrap items-start justify-start gap-8 overflow-x-hidden overflow-y-auto p-4 [scrollbar-color:#fff_#0000] [scrollbar-gutter:stable]"
        >
          {modInfos.length === 0 ? (
            <div className="flex size-full items-center justify-center">
              <img src={BangbooLoading} alt="Loading..." className="h-32 w-32 object-contain" />
            </div>
          ) : (
            modInfos.map((modInfo) => <ModCard key={modInfo.name} modInfo={modInfo} />)
          )}
        </div>

        {/* Multi-Select Dropdown */}
        <div className="absolute bottom-4 left-8 flex flex-col items-start">
          {shouldMultiSelectMenuMount && (
            <div
              className={clsx(
                "mb-2 flex max-h-40 w-full flex-col gap-2 overflow-x-hidden overflow-y-auto rounded-2xl bg-[#222] p-2 transition-[opacity,transform] duration-200 ease-in-out",
                isMultiSelectMenuTransitioned
                  ? "pointer-events-auto translate-y-0 opacity-100"
                  : "pointer-events-none translate-y-[50%] opacity-0"
              )}
            >
              {["selectAll", "selectNone"].map((option) => (
                <div
                  key={option}
                  className="hover:bg-zzzYellow flex h-10 cursor-pointer items-center justify-start overflow-hidden rounded-xl p-2 whitespace-nowrap text-white hover:text-black"
                  onClick={() => {
                    handleMultiSelect(option as "selectAll" | "selectNone");
                    toggleMultiSelectMenu();
                  }}
                >
                  {t(`common.${option}`)}
                </div>
              ))}
            </div>
          )}
          <ZzzButton onClick={() => toggleMultiSelectMenu()} className="shadow-xl">
            <div className="flex size-full flex-row items-center justify-between gap-2 overflow-hidden">
              <span className="truncate">{t("common.multiSelect")}</span>
              <FaCaretUp className={`transition-all ${shouldMultiSelectMenuMount && "rotate-180"}`} />
            </div>
          </ZzzButton>
        </div>

        {/* Preset Dropdown and Add Button */}
        <div className="absolute right-8 bottom-4 flex flex-col items-end">
          {shouldPresetsMenuMount && (
            <div
              className={clsx(
                "mb-2 flex max-h-40 w-full flex-col gap-2 overflow-x-hidden overflow-y-auto rounded-2xl bg-[#222] p-2 transition-[opacity,transform] duration-200 ease-in-out",
                isPresetsMenuTransitioned
                  ? "pointer-events-auto translate-y-0 opacity-100"
                  : "pointer-events-none translate-y-[50%] opacity-0"
              )}
            >
              {allPresetNames.map((name) => (
                <div
                  key={name}
                  className={clsx(
                    "hover:bg-zzzYellow flex h-10 cursor-pointer items-center justify-end overflow-hidden rounded-xl p-2 whitespace-nowrap text-white hover:text-black",
                    name === currentPresetName && "text-zzzYellow"
                  )}
                  onClick={async () => await handleSwitchPreset(name)}
                >
                  {name}
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <ZzzButton type="Add" onClick={() => togglePresetsModalOpen()} />

            <ZzzButton onClick={() => togglePresetsMenu()} className="w-auto max-w-70">
              <div className="flex size-full flex-row items-center justify-center gap-2 overflow-hidden">
                <span className="truncate">{currentPresetName}</span>
                <FaCaretUp className={`transition-all ${shouldPresetsMenuMount && "rotate-180"}`} />
              </div>
            </ZzzButton>
          </div>
        </div>
        {shouldPresetsModalMount &&
          createPortal(
            <EditPresetsModal
              className={`transition-[opacity,scale] duration-200 ease-in-out ${isPresetsModalTransitioned ? "pointer-events-auto scale-y-100 opacity-100" : "pointer-events-none scale-y-0 opacity-0"}`}
              onClose={() => togglePresetsModalOpen()}
            />,
            document.body
          )}
      </div>
      <RenderAlert />
    </>
  );
};

export default ModCardGrid;
