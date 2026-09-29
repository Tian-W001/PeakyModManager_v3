import { useId, useState } from "react";
import { useAppDispatch, useAppSelector } from "@renderer/redux/hooks";
import { editModInfo, selectLibraryPath, removeModInfo, selectD3dxUserPath } from "@renderer/redux/slices/librarySlice";
import { ModInfo } from "@shared/modInfo";
import { ModType, modTypeList } from "@shared/modType";
import defaultCover from "@renderer/assets/default_cover.jpg";
import { Character, characterNameList } from "@shared/character";
import { useTranslation } from "react-i18next";
import ZzzSelect from "../components/zzzSelect";
import { FaCaretUp } from "react-icons/fa6";
import ZzzField from "@renderer/components/zzzField";
import { useAlertModal } from "@renderer/hooks/useAlertModal";
import { removeModFromAllPresets } from "@renderer/redux/slices/presetsSlice";
import { setSelectedCharacter, setSelectedMenuItem, setSelectedOutfitId } from "@renderer/redux/slices/uiSlice";
import Exit from "@renderer/components/Exit";
import ZzzButton from "@renderer/components/zzzButton";
import Locate from "@renderer/assets/icons/Locate.png";
import Track from "@renderer/assets/icons/Track.png";
import clsx from "clsx";
import toast from "react-hot-toast";
import ZzzToast from "@renderer/components/zzzToast";
import ToggleKeyEditor from "@renderer/components/ToggleKeyEditor";
import { SyncTogglesResult } from "@shared/threeDMigoto";
import { getOutfitIds } from "@shared/outfit";
import { getCharacterAvatar } from "@renderer/utils/characterAvatars";
import { getOutfitIcon } from "@renderer/utils/outfitAvatars";
import unknownCharacterIcon from "@renderer/assets/avatars/character_avatars/Unknown.webp";
import unknownOutfitIcon from "@renderer/assets/outfit_icons/Unknown.webp";

type LabelIconProps = {
  src: string;
  onClick?: () => void;
  className?: string;
};

const LabelIcon = ({ src, onClick, className }: LabelIconProps) => {
  const filterId = useId();

  return (
    <div className={clsx("size-8", className)} onClick={onClick}>
      <svg className="pointer-events-none absolute top-0 left-0 h-8 w-13" viewBox="0 0 52 32">
        <defs>
          <filter id={filterId} x="-20%" y="-100%" width="140%" height="300%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" />
            <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8" />
          </filter>
        </defs>
        <g filter={`url(#${filterId})`} fill="black">
          <circle cx="16" cy="16" r="16" />
          <rect
            width="48"
            height="32"
            rx="16"
            className="translate-x-(--field-inset) transition-[translate] duration-(--field-duration) ease-(--field-easing) motion-reduce:transition-none"
          />
        </g>
      </svg>
      <div className="hover:border-zzzYellow relative size-full cursor-pointer overflow-hidden rounded-full border-3 bg-black">
        <img src={src} alt="" draggable={false} className="size-full object-contain" />
      </div>
    </div>
  );
};

const DetailedModal = ({
  modInfo,
  onClose,
  className,
}: {
  modInfo: ModInfo;
  onClose: () => void;
  className?: string;
}) => {
  const dispatch = useAppDispatch();
  const libraryPath = useAppSelector(selectLibraryPath);
  const d3dxUserPath = useAppSelector(selectD3dxUserPath);
  const [localModInfo, setLocalModInfo] = useState<ModInfo>(modInfo);
  const { t } = useTranslation();
  const handleLocateSelectedCharacter = () => {
    dispatch(setSelectedMenuItem("Character"));
    dispatch(setSelectedCharacter(localModInfo.character as Character));
    onClose();
  };

  const handleLocateSelectedOutfit = () => {
    dispatch(setSelectedMenuItem("Character"));
    dispatch(setSelectedCharacter(localModInfo.character as Character));
    dispatch(setSelectedOutfitId(localModInfo.outfitId ?? 0));
    onClose();
  };

  const handleModInfoChange = (field: keyof ModInfo, value: string) => {
    setLocalModInfo((prev) => {
      if (field === "modType") {
        const modType = value as ModType;
        if (modType === "Character") {
          return { ...prev, modType, character: prev.character ?? "Unknown", outfitId: prev.outfitId ?? 0 };
        }
        const { character: _character, outfitId: _outfitId, ...base } = prev;
        return { ...base, modType };
      }
      if (field === "character" && prev.modType === "Character") {
        return { ...prev, character: value as Character, outfitId: prev.character === value ? prev.outfitId : 0 };
      }
      if (field === "outfitId" && prev.modType === "Character") {
        return { ...prev, outfitId: Number(value) };
      }
      return { ...prev, [field]: value };
    });
  };

  const saveModInfoChanges = async () => {
    try {
      await dispatch(
        editModInfo({
          modName: modInfo.name,
          newModInfo: localModInfo,
        })
      ).unwrap();
      onClose();
    } catch {
      toast.custom(() => <ZzzToast message={t("modDetails.saveFailed")} />);
    }
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
        dispatch(removeModInfo(modInfo.name));
        dispatch(removeModFromAllPresets(modInfo.name));
        onClose();
      } else {
        toast.custom(() => <ZzzToast message={t("modDetails.deleteModFailed", { name: modInfo.name })} />, {
          duration: Infinity,
        });
      }
      hideAlert();
    };
    showAlert(
      t("modDetails.deleteModConfirm", { name: modInfo.name }),
      t("modDetails.deleteModConfirmMsg"),
      <>
        <ZzzButton type="Cancel" onClick={hideAlert}>
          {t("common.cancel")}
        </ZzzButton>
        <ZzzButton type="Ok" onClick={deleteMod}>
          {t("common.confirm")}
        </ZzzButton>
      </>
    );
  };

  const saveCover = async (imageSource: string) => {
    const newCoverName = await window.electron.ipcRenderer.invoke("import-mod-cover", modInfo.name, imageSource);
    if (newCoverName) {
      handleModInfoChange("coverImage", newCoverName);
    }
  };

  const handleViewCover = async () => {
    await window.electron.ipcRenderer.invoke("view-cover", modInfo.name, localModInfo.coverImage);
  };

  const handleSetCover = async () => {
    const imagePath = await window.electron.ipcRenderer.invoke("select-cover", modInfo.name);
    if (imagePath) {
      await saveCover(imagePath);
    }
  };

  const handleRemoveCover = async () => {
    handleModInfoChange("coverImage", "");
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const url = (e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain")).trim();
    const file = e.dataTransfer.files[0];
    const filePath = file ? window.api.getFilePath(file) : null;

    if (/^https?:\/\//i.test(url)) {
      await saveCover(url);
    } else if (file?.type.startsWith("image/") && filePath) {
      await saveCover(filePath);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleAutofill = async () => {
    const result = (await window.electron.ipcRenderer.invoke("autofill-modinfo", modInfo.name)) as {
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
        if (modInfo.title?.toLowerCase().includes(char.toLowerCase())) {
          matchedCharacter = char;
          break;
        }
      }

      if (matchedCharacter) {
        updates.modType = "Character";
        updates.character = matchedCharacter;
        updates.outfitId =
          localModInfo.modType === "Character" && localModInfo.character === matchedCharacter
            ? localModInfo.outfitId
            : 0;
      }

      if (Object.keys(updates).length > 0) {
        setLocalModInfo((prev) => ({ ...prev, ...updates }) as ModInfo);
      }
    }
  };

  const handleSyncToggles = async () => {
    if (!d3dxUserPath) {
      toast.custom(() => <ZzzToast message={t("modDetails.syncToggleNoD3dxPath")} />, { duration: 4000 });
      return;
    }
    const result = (await window.electron.ipcRenderer.invoke("sync-toggles", modInfo.name)) as SyncTogglesResult;
    if (!result?.ok) {
      showAlert(
        t("modDetails.syncToggleFailTitle"),
        undefined,
        <ZzzButton type="Ok" onClick={hideAlert}>
          {t("common.confirm")}
        </ZzzButton>
      );
    } else if (result.changes.length > 0) {
      const changedToggles = result.changes;
      const toggleCount = changedToggles.length;
      showAlert(
        t("modDetails.syncToggleSuccessTitle", { count: toggleCount }),
        changedToggles.map(({ variableName, newValue }) => `${variableName}=${newValue}`).join("\n"),
        <ZzzButton type="Ok" onClick={hideAlert}>
          {t("common.confirm")}
        </ZzzButton>
      );
    } else {
      showAlert(
        t("modDetails.syncToggleNoChangesTitle"),
        undefined,
        <ZzzButton type="Ok" onClick={hideAlert}>
          {t("common.confirm")}
        </ZzzButton>
      );
    }
  };

  return (
    <>
      <div className={clsx("modal-overlay gap-2", className)} id="modal-overlay">
        <div
          className="chess-background flex size-[70%] flex-row overflow-hidden rounded-4xl rounded-tr-xl border-4 border-black bg-[#333] inset-shadow-[1px_1px_2px_#fff2,-1px_-1px_2px_#0009]"
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
              className="group hover:border-zzzYellow relative size-full overflow-hidden rounded-2xl border-3 border-black bg-black shadow-[1px_1px_1px_#fff2] hover:border-2"
            >
              <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-[filter] duration-300 group-hover:blur-sm"
                style={{
                  backgroundImage: localModInfo.coverImage
                    ? `url("mod-image://local/${modInfo.name}/${localModInfo.coverImage}")`
                    : `url("${defaultCover}")`,
                }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                {localModInfo.coverImage ? (
                  <>
                    <ZzzButton onClick={handleRemoveCover} className="w-40">
                      {t("modDetails.removeCover")}
                    </ZzzButton>
                    <ZzzButton onClick={handleViewCover} className="w-40">
                      {t("modDetails.viewCover")}
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
              className="box-border flex h-14 min-w-0 items-center justify-between overflow-hidden py-2 pr-4"
              id="modal-title-area"
            >
              <div className="flex h-10 flex-row items-center gap-2 overflow-hidden">
                <img
                  src={Track}
                  alt="Track"
                  className="h-[80%] transition-transform hover:scale-120 hover:cursor-pointer"
                  onClick={handleOpenModFolder}
                />
                <div className="title-decorator flex h-10 min-w-0 items-center justify-between overflow-hidden">
                  <textarea
                    value={localModInfo.title ?? "No Title"}
                    onChange={(e) => handleModInfoChange("title", e.target.value)}
                    className="no-scrollbar hover:text-zzzYellow field-sizing-content h-full min-w-0 resize-none overflow-x-auto px-2 text-2xl whitespace-nowrap text-white italic"
                    spellCheck={false}
                  >
                    {modInfo.title}
                  </textarea>
                </div>
              </div>
              <Exit
                className="hover:fill-zzzYellow shrink-0 fill-[#c42209] transition-[fill_transform] hover:scale-110"
                onClick={onClose}
              />
            </div>
            <div
              className="flex flex-1 flex-col gap-2 overflow-hidden py-2 pr-4 [--field-duration:360ms] [--field-easing-open:cubic-bezier(0.22,1.35,0.36,1)] [--field-easing:cubic-bezier(0.22,1,0.36,1)]"
              id="mod-info-section"
            >
              <ZzzField
                title={t("modDetails.modType")}
                content={
                  <ZzzSelect
                    value={localModInfo.modType}
                    options={modTypeList.map((type) => ({ value: type, label: t(`modTypes.${type}`) }))}
                    onChange={(val) => handleModInfoChange("modType", val)}
                    renderTrigger={({ onClick, isOpen, selectedLabel }) => (
                      <button
                        type="button"
                        className="flex w-full cursor-pointer items-center justify-end gap-2 text-right"
                        onClick={onClick}
                      >
                        <span className="truncate">{selectedLabel}</span>
                        <FaCaretUp
                          size={12}
                          className={clsx("shrink-0 transition-transform", isOpen && "rotate-180")}
                        />
                      </button>
                    )}
                  />
                }
              />
              {localModInfo.modType === "Character" && (
                <div
                  className={clsx(
                    "group/field relative flex shrink-0 items-center [--field-inset:0px] hover:[--field-easing:var(--field-easing-open)] has-data-dropdown-open:[--field-easing:var(--field-easing-open)]",
                    localModInfo.character !== "Unknown" &&
                      "hover:[--field-inset:36px] has-data-dropdown-open:[--field-inset:36px]"
                  )}
                  id="mod-character"
                >
                  {localModInfo.character !== "Unknown" && (
                    <LabelIcon
                      src={getCharacterAvatar(localModInfo.character)}
                      onClick={handleLocateSelectedCharacter}
                      className="absolute left-0"
                    />
                  )}
                  <div className="pointer-events-none relative w-full min-w-0 pl-(--field-inset) transition-[padding-left] duration-(--field-duration) ease-(--field-easing) motion-reduce:transition-none">
                    <ZzzField
                      title={t("modDetails.character")}
                      className="pointer-events-auto"
                      content={
                        <ZzzSelect
                          value={localModInfo.character}
                          options={characterNameList.toReversed().map((char) => ({
                            value: char,
                            label: t(`characters.fullnames.${char}`),
                            labelIcon: (
                              <img
                                src={getCharacterAvatar(char)}
                                alt=""
                                draggable={false}
                                className="h-6 rounded-full object-contain"
                                onError={(event) => {
                                  event.currentTarget.src = unknownCharacterIcon;
                                }}
                              />
                            ),
                          }))}
                          onChange={(val) => handleModInfoChange("character", val)}
                          renderTrigger={({ onClick, isOpen, selectedLabel }) => (
                            <button
                              type="button"
                              className="flex w-full cursor-pointer items-center justify-end gap-2 text-right"
                              onClick={onClick}
                            >
                              <span className="truncate">{selectedLabel}</span>
                              <FaCaretUp
                                size={12}
                                className={clsx("shrink-0 transition-transform", isOpen && "rotate-180")}
                              />
                            </button>
                          )}
                        />
                      }
                    />
                  </div>
                </div>
              )}
              {localModInfo.modType === "Character" && localModInfo.character !== "Unknown" && (
                <div
                  className={clsx(
                    "group/field relative flex shrink-0 items-center [--field-inset:0px] hover:[--field-easing:var(--field-easing-open)] has-data-dropdown-open:[--field-easing:var(--field-easing-open)]",
                    localModInfo.outfitId !== 0 &&
                      "hover:[--field-inset:36px] has-data-dropdown-open:[--field-inset:36px]"
                  )}
                  id="mod-outfit"
                >
                  {localModInfo.outfitId !== 0 && (
                    <LabelIcon
                      src={getOutfitIcon(localModInfo.character, localModInfo.outfitId) ?? unknownOutfitIcon}
                      onClick={handleLocateSelectedOutfit}
                      className="absolute left-0"
                    />
                  )}
                  <div className="pointer-events-none relative w-full min-w-0 pl-(--field-inset) transition-[padding-left] duration-(--field-duration) ease-(--field-easing) motion-reduce:transition-none">
                    <ZzzField
                      title={t("outfits.label")}
                      className="pointer-events-auto"
                      content={
                        <ZzzSelect
                          value={String(localModInfo.outfitId)}
                          options={getOutfitIds(localModInfo.character).map((id) => ({
                            value: String(id),
                            label: t(id === 0 ? "outfits.none" : `characters.outfits.${localModInfo.character}.${id}`),
                            labelIcon: id !== 0 && (
                              <img
                                src={getOutfitIcon(localModInfo.character, id)}
                                alt=""
                                draggable={false}
                                className="h-6 rounded-full object-contain"
                                onError={(event) => {
                                  event.currentTarget.src = unknownOutfitIcon;
                                }}
                              />
                            ),
                          }))}
                          onChange={(value) => handleModInfoChange("outfitId", value)}
                          renderTrigger={({ onClick, isOpen, selectedLabel }) => (
                            <button
                              type="button"
                              className="flex w-full cursor-pointer items-center justify-end gap-2 text-right"
                              onClick={onClick}
                            >
                              <span className="truncate">{selectedLabel}</span>
                              <FaCaretUp
                                size={12}
                                className={clsx("shrink-0 transition-transform", isOpen && "rotate-180")}
                              />
                            </button>
                          )}
                        />
                      }
                    />
                  </div>
                </div>
              )}
              <div
                className={clsx(
                  "group/field relative flex min-w-0 shrink-0 items-center [--field-inset:0px] hover:[--field-easing:var(--field-easing-open)]",
                  localModInfo.source && "hover:[--field-inset:36px]"
                )}
                id="mod-source"
              >
                {localModInfo.source && (
                  <a href={localModInfo.source} target="_blank" rel="noreferrer" className="absolute left-0">
                    <LabelIcon src={Locate} />
                  </a>
                )}
                <div className="pointer-events-none relative w-full min-w-0 pl-(--field-inset) transition-[padding-left] duration-(--field-duration) ease-(--field-easing) motion-reduce:transition-none">
                  <ZzzField
                    title={t("modDetails.source")}
                    className="pointer-events-auto"
                    content={
                      <input
                        className="w-full min-w-0 text-right font-bold"
                        placeholder={t("modDetails.unknownSource")}
                        value={localModInfo.source}
                        onChange={(e) => handleModInfoChange("source", e.target.value)}
                      />
                    }
                  />
                </div>
              </div>
              <ToggleKeyEditor modName={modInfo.name} />
              <textarea
                value={localModInfo.description}
                placeholder={t("modDetails.description")}
                className="no-scrollbar field-sizing-content min-h-20 w-full flex-1 resize-none overflow-scroll rounded-2xl bg-black p-2 font-bold wrap-normal whitespace-pre-line text-white shadow-[1px_1px_1px_#fff2] transition-[flex-grow,min-height] duration-150 ease-out peer-focus-within/toggles:min-h-10 peer-focus-within/toggles:grow-0 peer-hover/toggles:min-h-10 peer-hover/toggles:grow-0"
                onChange={(e) => handleModInfoChange("description", e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="flex w-[70%] flex-row items-center justify-between gap-4" id="outside-buttons-container">
          <ZzzButton type="FairyWarning" onClick={handleDeleteMod}>
            {t("common.delete")}
          </ZzzButton>
          <div className="flex flex-row gap-4">
            <ZzzButton type="FairyAI" onClick={handleAutofill}>
              {t("modDetails.autofill")}
            </ZzzButton>
            <ZzzButton type="Refresh" onClick={handleSyncToggles}>
              {t("modDetails.syncToggles")}
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
