import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@renderer/redux/hooks";
import { editModInfo, selectLibraryPath, removeModInfo } from "@renderer/redux/slices/librarySlice";
import { ModInfo } from "@shared/modInfo";
import { modTypeList } from "@shared/modType";
import defaultCover from "@renderer/assets/default_cover.jpg";
import { Character, characterNameList } from "@shared/character";
import { useTranslation } from "react-i18next";
import ZzzSelect from "../components/zzzSelect";
import { useAlertModal } from "@renderer/hooks/useAlertModal";
import { removeModFromAllPresets } from "@renderer/redux/slices/presetsSlice";
import Exit from "@renderer/components/Exit";
import ZzzButton from "@renderer/components/zzzButton";

const DetailedModal = ({ modInfo, onClose }: { modInfo: ModInfo; onClose: () => void }) => {
  const dispatch = useAppDispatch();
  const libraryPath = useAppSelector(selectLibraryPath);
  const [localModInfo, setLocalModInfo] = useState<ModInfo>(modInfo);
  const { t } = useTranslation();

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

  const { showAlert, hideAlert, RenderAlert } = useAlertModal();
  const handleDeleteMod = async () => {
    const deleteMod = async () => {
      const success = await window.electron.ipcRenderer.invoke("delete-mod", modInfo.name);
      if (success) {
        //await dispatch(loadLibrary());
        dispatch(removeModInfo(modInfo.name));
        dispatch(removeModFromAllPresets(modInfo.name));
        onClose();
      }
      hideAlert();
    };
    showAlert(t("modDetails.deleteConfirm", { name: modInfo.name }), undefined, [
      {
        name: t("common.cancel"),
        f: hideAlert,
      },
      {
        name: t("common.confirm"),
        f: deleteMod,
      },
    ]);
  };

  const handleSetCover = async () => {
    const imagePath = await window.electron.ipcRenderer.invoke("select-cover", modInfo.name);
    console.log("Selected cover image path:", imagePath);
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

  const handleAutofill = async () => {
    const result = (await window.electron.ipcRenderer.invoke("autofill-mod-info", modInfo.name)) as {
      description: string | null;
      coverImage: string | null;
    };
    if (result) {
      const { description, coverImage } = result;
      const updates: Partial<ModInfo> = {};

      if (description) {
        updates.description = description;
      }
      if (coverImage) {
        updates.coverImage = coverImage;
      }

      // Character matching
      let matchedCharacter: Character | null = null;
      const sortedChars = [...characterNameList].filter((c) => c !== "Unknown").sort((a, b) => b.length - a.length);

      for (const char of sortedChars) {
        if (modInfo.name.toLowerCase().includes(char.toLowerCase())) {
          matchedCharacter = char;
          break;
        }
      }

      if (matchedCharacter) {
        updates.modType = "Character";
        updates.character = matchedCharacter;
      }

      if (Object.keys(updates).length > 0) {
        setLocalModInfo((prev) => ({ ...prev, ...updates }) as ModInfo);
        dispatch(editModInfo({ modName: modInfo.name, newModInfo: updates }));
      }
    }
  };

  return (
    <>
      <div className="modal-overlay gap-2" id="modal-overlay">
        <div
          className="chess-background flex size-[70%] flex-row overflow-hidden rounded-4xl border-4 border-black bg-[#333] inset-shadow-[1px_1px_2px_#fff2,-1px_-1px_2px_#0009]"
          id="modal-container"
        >
          <div
            className="relative h-full w-[40%] shrink-0 overflow-hidden p-4"
            id="left-section"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <div
              id="cover-image-container"
              className="group hover:border-zzzYellow relative h-full w-full overflow-hidden rounded-2xl border-3 border-black bg-black shadow-[1px_1px_1px_#fff2] hover:border-2"
            >
              <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-300 group-hover:blur-sm"
                style={{
                  backgroundImage: localModInfo.coverImage
                    ? `url("mod-image://local/${modInfo.name}/${localModInfo.coverImage}")`
                    : `url("${defaultCover}")`,
                }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 opacity-0 transition-all duration-300 group-hover:opacity-100">
                {localModInfo.coverImage ? (
                  <>
                    <ZzzButton onClick={handleRemoveCover} className="w-40">
                      {t("modDetails.removeCover")}
                    </ZzzButton>
                    <ZzzButton onClick={handleSetCover} className="w-40">
                      {t("modDetails.changeCover")}
                    </ZzzButton>
                  </>
                ) : (
                  <ZzzButton onClick={handleSetCover} className="w-40">
                    {t("modDetails.setCover")}
                  </ZzzButton>
                )}
              </div>
            </div>
          </div>
          <div className="flex h-full flex-1 flex-col justify-between gap-2 overflow-hidden" id="right-section">
            <div
              className="box-border flex h-14 min-w-0 items-center justify-between gap-2 overflow-hidden py-2 pr-4"
              id="modal-title-area"
            >
              <div className="title-decorator flex min-w-0 items-center justify-between overflow-hidden">
                <p className="min-w-0 overflow-hidden px-2 text-2xl font-bold text-ellipsis whitespace-nowrap text-white italic">
                  {modInfo.name}
                </p>
              </div>
              <Exit
                className="hover:fill-zzzYellow shrink-0 fill-[#c42209] transition-all hover:scale-110"
                onClick={onClose}
              />
            </div>
            <div className="flex flex-1 flex-col gap-2 overflow-hidden py-2 pr-4" id="mod-info-section">
              <textarea
                value={localModInfo.description}
                placeholder={t("modDetails.description")}
                className="no-scrollbar min-h-20 w-full resize-none overflow-scroll rounded-2xl bg-black p-2 font-bold wrap-normal whitespace-pre-line text-white shadow-[1px_1px_1px_#fff2]"
                onChange={(e) => handleModInfoChange("description", e.target.value)}
                onBlur={() => handleModInfoBlur("description")}
              />
              <ZzzSelect
                label={t("modDetails.modType")}
                value={localModInfo.modType}
                options={modTypeList.map((type) => ({ value: type, label: t(`modTypes.${type}`) }))}
                onChange={(val) => handleModInfoChange("modType", val)}
                className="px-4 py-1 shadow-[1px_1px_1px_#fff2]"
              />
              {localModInfo.modType === "Character" && (
                <ZzzSelect
                  label={t("modDetails.character")}
                  value={localModInfo.character}
                  options={characterNameList.map((char) => ({
                    value: char,
                    label: t(`characters.fullnames.${char}`),
                  }))}
                  onChange={(val) => handleModInfoChange("character", val)}
                  className="px-4 py-1 shadow-[1px_1px_1px_#fff2]"
                />
              )}
              <div
                className="hover:text-zzzYellow flex flex-row items-center justify-between gap-8 rounded-full bg-black px-3.5 py-1 pr-9 font-bold text-white shadow-[1px_1px_1px_#fff2]"
                id="mod-source"
              >
                <span className="">{t("modDetails.source")}</span>
                <input
                  className="flex-1 text-right font-bold text-white"
                  placeholder={t("modDetails.unknownSource")}
                  value={localModInfo.source}
                  onChange={(e) => handleModInfoChange("source", e.target.value)}
                  onBlur={() => handleModInfoBlur("source")}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="flex w-[70%] flex-row items-center justify-between gap-4" id="outside-buttons-container">
          <ZzzButton type="FairyWarning" onClick={handleDeleteMod}>
            {t("modDetails.deleteMod")}
          </ZzzButton>
          <div className="flex flex-row gap-4">
            <ZzzButton type="FairyAI" onClick={handleAutofill}>
              {t("modDetails.autofill")}
            </ZzzButton>
            <ZzzButton type="Track" onClick={handleOpenModFolder}>
              {t("modDetails.openModFolder")}
            </ZzzButton>
            <ZzzButton type="Save" onClick={saveModInfoChanges}>
              {t("common.save")}
            </ZzzButton>
          </div>
        </div>
      </div>
      <RenderAlert />
    </>
  );
};

export default DetailedModal;
