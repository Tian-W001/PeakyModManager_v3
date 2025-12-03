import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@renderer/redux/hooks";
import { editModInfo, selectLibraryPath, loadLibrary } from "@renderer/redux/slices/librarySlice";
import { ModInfo } from "@shared/modInfo";
import { modTypeList } from "@shared/modType";
import defaultCover from "@renderer/assets/default_cover.jpg";
import { characterNameList } from "@shared/character";
import { useTranslation } from "react-i18next";
import ZzzSelect from "../components/zzzSelect";

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

  const handleDeleteMod = async () => {
    const confirmed = confirm(t("modDetails.deleteConfirm", { name: modInfo.name }));
    if (confirmed) {
      const success = await window.electron.ipcRenderer.invoke("delete-mod", modInfo.name);
      if (success) {
        dispatch(loadLibrary(null));
        onClose();
      }
    }
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
      console.log("Dropped file:", file);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const imagePath = file.path;
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

  return (
    <div
      className="fixed inset-0 z-50 flex size-full flex-col items-center justify-center gap-4 bg-black/80"
      id="modal-overlay"
    >
      <div
        className="flex size-[70%] flex-row overflow-auto rounded-2xl border-2 border-black bg-white"
        id="modal-container"
      >
        <div
          className="group relative h-full w-[40%] bg-gray-200"
          id="left-section"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <img
            src={`mod-image://local/${modInfo.name}/${localModInfo.coverImage}`}
            alt="Cover"
            className="h-full w-full object-cover transition-all duration-300 group-hover:blur"
            onError={(e) => (e.currentTarget.src = defaultCover)}
          />
          <div className="absolute inset-0 hidden flex-col items-center justify-center gap-4 group-hover:flex">
            {localModInfo.coverImage ? (
              <>
                <button
                  onClick={handleRemoveCover}
                  className="rounded bg-red-600 px-4 py-2 font-bold text-white hover:bg-red-700"
                >
                  {t("modDetails.removeCover")}
                </button>
                <button
                  onClick={handleSetCover}
                  className="rounded bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-700"
                >
                  {t("modDetails.changeCover")}
                </button>
              </>
            ) : (
              <button
                onClick={handleSetCover}
                className="rounded bg-green-600 px-4 py-2 font-bold text-white hover:bg-green-700"
              >
                {t("modDetails.setCover")}
              </button>
            )}
          </div>
        </div>
        <div className="flex h-full flex-1 flex-col justify-between gap-2 bg-gray-300" id="right-section">
          <h1>{modInfo.name}</h1>
          <div className="flex flex-1 flex-col gap-2 overflow-hidden p-4" id="mod-info-section">
            <textarea
              value={localModInfo.description}
              placeholder={t("modDetails.description")}
              className="no-scrollbar min-h-20 w-full resize-none overflow-scroll rounded-2xl bg-black p-2 font-bold wrap-normal whitespace-pre-line text-white"
              onChange={(e) => handleModInfoChange("description", e.target.value)}
              onBlur={() => handleModInfoBlur("description")}
            />
            <ZzzSelect
              label={t("modDetails.modType")}
              value={localModInfo.modType}
              options={modTypeList.map((type) => ({ value: type, label: t(`modTypes.${type}`) }))}
              onChange={(val) => handleModInfoChange("modType", val)}
              className="px-4 py-1"
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
                className="px-4 py-1"
              />
            )}
            <div
              className="hover:text-zzzYellow flex flex-row items-center justify-between gap-8 rounded-full bg-black px-3.5 py-1 pr-9 font-bold text-white"
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
        <button onClick={handleDeleteMod} className="iron-border bg-red-600 text-white hover:bg-red-700">
          {t("modDetails.deleteMod")}
        </button>
        <div className="flex flex-row gap-4">
          <button onClick={handleOpenModFolder} className="iron-border chess-background">
            {t("modDetails.openModFolder")}
          </button>
          <button onClick={onClose} className="iron-border chess-background">
            {t("common.close")}
          </button>
          <button onClick={saveModInfoChanges} className="iron-border chess-background">
            {t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DetailedModal;
