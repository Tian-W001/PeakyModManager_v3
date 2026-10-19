import { ModInfo } from "@shared/modInfo";
import ModCard from "./modCard";
import ZzzButton from "@renderer/components/zzzButton";
import ZzzSelect from "@renderer/components/zzzSelect";
import clsx from "clsx";
import { useEffect, useCallback, useMemo, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "@renderer/redux/hooks";
import {
  applyMods,
  clearDiffList,
  selectAllPresetNames,
  selectCurrentPresetMods,
  selectCurrentPresetName,
  selectDiffList,
  setCurrentPreset,
} from "@renderer/redux/slices/presetsSlice";
import EditPresetsModal from "@renderer/Modals/EditPresetsModal/modal";
import { addModInfo, editModInfo } from "@renderer/redux/slices/librarySlice";
import {
  selectSelectedCharacter,
  selectSelectedMenuItem,
  selectSelectedOutfitId,
  setSelectedCharacter,
  setSelectedMenuItem,
} from "@renderer/redux/slices/uiSlice";
import { FaCaretUp } from "react-icons/fa6";
import { useAlertModal } from "@renderer/hooks/useAlertModal";
import { useTranslation } from "react-i18next";
import BangbooLoading from "@renderer/assets/bangboo_loading.gif";
import { toast } from "react-hot-toast";
import ZzzToast from "@renderer/components/zzzToast";
import { ModState } from "@shared/modState";
import { selectModTypeFilteredModCards } from "@renderer/redux/selectors/ModCardsSelector";

const ModCardGrid = ({ className }: { className?: string }) => {
  const selectedModInfos = useAppSelector(selectModTypeFilteredModCards);
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const currentPresetName = useAppSelector(selectCurrentPresetName);
  const allPresetNames = useAppSelector(selectAllPresetNames);
  const diffList = useAppSelector(selectDiffList);
  const currentPresetMods = useAppSelector(selectCurrentPresetMods);
  const currentPresetModSet = useMemo(() => new Set(currentPresetMods), [currentPresetMods]);
  const getModState = useCallback(
    (modName: string): ModState => {
      const diffEntry = diffList[modName];
      if (diffEntry !== undefined) {
        return diffEntry ? "WillEnable" : "WillDisable";
      }
      return currentPresetModSet.has(modName) ? "Enabled" : "Disabled";
    },
    [currentPresetModSet, diffList]
  );

  const [isPresetsOpen, setPresetsOpen] = useState(false);

  const ref = useRef<HTMLDivElement>(null);
  const selectedMenuItem = useAppSelector(selectSelectedMenuItem);
  const selectedCharacter = useAppSelector(selectSelectedCharacter);
  const selectedOutfitId = useAppSelector(selectSelectedOutfitId);

  useEffect(() => {
    ref.current?.scrollTo(0, 0);
  }, [selectedMenuItem, selectedCharacter, selectedOutfitId]);

  const { showAlert, hideAlert, alert } = useAlertModal();

  const importMod = useCallback(
    async (filePath: string) => {
      // Setup temporary listener for overwrite confirmation
      let overwriteConfirmed = false;
      const overwriteListener = (
        _event,
        { modName, responseChannel }: { modName: string; responseChannel: string }
      ) => {
        showAlert(
          t("import.modExists", { modName }),
          t("import.overwriteConfirm"),
          <>
            <ZzzButton
              type="Cancel"
              onClick={() => {
                window.electron.ipcRenderer.send(responseChannel, false);
                hideAlert();
              }}
            >
              {t("common.cancel")}
            </ZzzButton>
            <ZzzButton
              type="Refresh"
              onClick={() => {
                window.electron.ipcRenderer.send(responseChannel, true);
                overwriteConfirmed = true;
                hideAlert();
              }}
            >
              {t("common.overwrite")}
            </ZzzButton>
          </>
        );
      };

      const removeListener = window.electron.ipcRenderer.on("overwrite-ask", overwriteListener);
      let newModInfo: ModInfo | null = null;
      try {
        newModInfo = (await window.electron.ipcRenderer.invoke("import-mod", filePath)) as ModInfo | null;
      } finally {
        removeListener();
      }

      if (newModInfo) {
        if (overwriteConfirmed) {
          dispatch(editModInfo({ modName: newModInfo.name, newModInfo }));
        } else {
          dispatch(addModInfo(newModInfo));
        }
        dispatch(setSelectedMenuItem(newModInfo.modType ?? "Unknown"));
        if (newModInfo.character) {
          dispatch(setSelectedCharacter(newModInfo.character));
        }
      } else {
        toast.custom(() => <ZzzToast message={t("import.importFailed")} />, {
          duration: 5000,
        });
      }
    },
    [dispatch, t, showAlert, hideAlert]
  );

  useEffect(() => {
    const removeListener = window.electron.ipcRenderer.on("import-mod", (_event, filePath) => {
      importMod(filePath);
    });
    return () => {
      removeListener();
    };
  }, [importMod]);

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.stopPropagation();

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      e.preventDefault();
      const item = e.dataTransfer.items[0];
      if (item.kind !== "file") {
        return;
      }

      const entry = item.webkitGetAsEntry();
      const file = item.getAsFile();
      if (!file) return;

      const isDirectory = entry?.isDirectory;
      const isZipped = /\.(zip|7z|rar|tar)$/i.test(file.name);

      if (!isDirectory && !isZipped) {
        console.error(item, "not a folder or zipped file");
        return;
      }

      const filePath = window.api.getFilePath(file);
      console.log("Dropped item:", filePath);
      if (filePath) {
        await importMod(filePath);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleSwitchPreset = async (name: string) => {
    if (name === currentPresetName) return;

    const applyChanges = async () => {
      dispatch(applyMods(diffList));
      //no need to call ipc here, as this preset will be switched right after
      dispatch(clearDiffList());
    };
    const switchPreset = async () => {
      await window.electron.ipcRenderer.invoke("clear-target-path");
      dispatch(setCurrentPreset(name));
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
      <div className={clsx("relative", className)} onDrop={handleDrop} onDragOver={handleDragOver}>
        <div
          ref={ref}
          className="flex size-full flex-wrap items-start justify-start gap-8 overflow-x-hidden overflow-y-auto p-4 [scrollbar-color:#fff_#0000] [scrollbar-gutter:stable]"
        >
          {selectedModInfos.length === 0 ? (
            <div className="flex size-full items-center justify-center">
              <img src={BangbooLoading} alt="Loading..." className="h-32 w-32 object-contain" />
            </div>
          ) : (
            selectedModInfos.map((modInfo) => (
              <ModCard
                className="h-87.5"
                key={modInfo.name}
                modInfo={modInfo}
                currentModState={getModState(modInfo.name)}
              />
            ))
          )}
        </div>

        {/* Preset Dropdown and Add Button */}
        <div className="absolute right-8 bottom-4 flex items-center gap-2">
          <ZzzButton type="Add" onClick={() => setPresetsOpen(true)} />
          <ZzzSelect
            value={currentPresetName}
            options={allPresetNames.map((name) => ({ value: name, label: name }))}
            onChange={handleSwitchPreset}
            placement="top"
            dropdownClassName="w-max min-w-full max-w-70"
            renderTrigger={({ onClick, isOpen }) => (
              <ZzzButton onClick={onClick} className="w-auto max-w-70">
                <div className="flex size-full flex-row items-center justify-center gap-2 overflow-hidden">
                  <span className="truncate">{currentPresetName}</span>
                  <FaCaretUp className={clsx("shrink-0 transition-transform", isOpen && "rotate-180")} />
                </div>
              </ZzzButton>
            )}
          />
        </div>
        <EditPresetsModal isOpen={isPresetsOpen} onClose={() => setPresetsOpen(false)} />
      </div>
      {alert}
    </>
  );
};

export default ModCardGrid;
