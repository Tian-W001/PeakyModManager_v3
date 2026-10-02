import styles from "./modal.module.css";
import SelectTrigger from "../components/SelectTrigger";
import FieldIcon from "./components/FieldIcon";
import CoverEditor from "./components/CoverEditor";
import DecoratedTitle from "../components/DecoratedTitle";
import ModalOverlay from "../components/ModalOverlay";
import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@renderer/redux/hooks";
import { editModInfo, selectLibraryPath, removeModInfo, selectD3dxUserPath } from "@renderer/redux/slices/librarySlice";
import { ModInfo } from "@shared/modInfo";
import { ModType, modTypeList } from "@shared/modType";
import { Character, characterNameList } from "@shared/character";
import { useTranslation } from "react-i18next";
import ZzzSelect from "@renderer/components/zzzSelect";
import ZzzField from "@renderer/components/zzzField";
import { useAlertModal } from "@renderer/hooks/useAlertModal";
import { removeModFromAllPresets } from "@renderer/redux/slices/presetsSlice";
import { setSelectedCharacter, setSelectedMenuItem, setSelectedOutfitId } from "@renderer/redux/slices/uiSlice";
import Exit from "../components/Exit";
import ZzzButton from "@renderer/components/zzzButton";
import Locate from "@renderer/assets/icons/Locate.png";
import Track from "@renderer/assets/icons/Track.png";
import clsx from "clsx";
import toast from "react-hot-toast";
import ZzzToast from "@renderer/components/zzzToast";
import ToggleKeyEditor from "./components/ToggleKeyEditor";
import { SyncTogglesResult } from "@shared/threeDMigoto";
import { getOutfitIds } from "@shared/outfit";
import { getCharacterAvatar } from "@renderer/utils/characterAvatars";
import { getOutfitIcon } from "@renderer/utils/outfitAvatars";
import unknownCharacterIcon from "@renderer/assets/avatars/character_avatars/Unknown.webp";
import unknownOutfitIcon from "@renderer/assets/outfit_icons/Unknown.webp";

const getSourceUrl = (source: string): string | null => {
  const trimmedSource = source.trim();
  if (!trimmedSource) return null;

  try {
    const url = new URL(/^https?:\/\//i.test(trimmedSource) ? trimmedSource : `https://${trimmedSource}`);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
};

const DetailedModalContent = ({ modInfo, onClose }: { modInfo: ModInfo; onClose: () => void }) => {
  const dispatch = useAppDispatch();
  const libraryPath = useAppSelector(selectLibraryPath);
  const d3dxUserPath = useAppSelector(selectD3dxUserPath);
  const [localModInfo, setLocalModInfo] = useState<ModInfo>(modInfo);
  const { t } = useTranslation();
  const sourceUrl = getSourceUrl(localModInfo.source);

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

  const { showAlert, hideAlert, alert } = useAlertModal();
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
      <div
        className="chess-background flex size-[70%] flex-row overflow-hidden rounded-4xl rounded-tr-xl border-4 border-black bg-[#333] inset-shadow-[1px_1px_2px_#fff2,-1px_-1px_2px_#0009]"
        id="modal-container"
      >
        <CoverEditor
          className="h-full w-[40%] shrink-0"
          modName={modInfo.name}
          coverImage={localModInfo.coverImage}
          onCoverChange={(coverImage) => handleModInfoChange("coverImage", coverImage)}
        />
        <div className="flex h-full flex-1 flex-col justify-between gap-2 overflow-hidden py-3" id="right-section">
          <div
            className="box-border flex h-10 min-w-0 items-center justify-between overflow-visible pr-3"
            id="modal-title-area"
          >
            <div className="flex h-10 flex-row items-center gap-2 overflow-hidden">
              <img
                src={Track}
                alt="Track"
                className="h-[80%] transition-transform hover:scale-120 hover:cursor-pointer"
                onClick={handleOpenModFolder}
              />
              <DecoratedTitle className="flex h-10 min-w-0 items-center justify-between overflow-hidden">
                <textarea
                  value={localModInfo.title ?? "No Title"}
                  onChange={(e) => handleModInfoChange("title", e.target.value)}
                  className="no-scrollbar hover:text-zzzYellow field-sizing-content h-lh min-w-0 resize-none overflow-x-auto px-2 text-[24px] whitespace-nowrap text-white italic"
                  spellCheck={false}
                >
                  {modInfo.title}
                </textarea>
              </DecoratedTitle>
            </div>
            <Exit onClick={onClose} />
          </div>
          <div
            className="flex flex-1 flex-col gap-2 overflow-hidden pr-3 [--field-duration:360ms] [--field-easing-open:cubic-bezier(0.22,1.35,0.36,1)] [--field-easing:cubic-bezier(0.22,1,0.36,1)]"
            id="mod-info-section"
          >
            <ZzzField
              title={t("modDetails.modType")}
              content={
                <ZzzSelect
                  value={localModInfo.modType}
                  options={modTypeList.map((type) => ({ value: type, label: t(`modTypes.${type}`) }))}
                  onChange={(val) => handleModInfoChange("modType", val)}
                  renderTrigger={(props) => <SelectTrigger {...props} />}
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
                  <FieldIcon
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
                        renderTrigger={(props) => <SelectTrigger {...props} />}
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
                  <FieldIcon
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
                        renderTrigger={(props) => <SelectTrigger {...props} />}
                      />
                    }
                  />
                </div>
              </div>
            )}
            <div
              className={clsx(
                "group/field relative flex min-w-0 shrink-0 items-center [--field-inset:0px] hover:[--field-easing:var(--field-easing-open)]",
                sourceUrl && "hover:[--field-inset:36px]"
              )}
              id="mod-source"
            >
              {sourceUrl && (
                <a href={sourceUrl} target="_blank" rel="noreferrer" className="absolute left-0">
                  <FieldIcon src={Locate} />
                </a>
              )}
              <div className="pointer-events-none relative w-full min-w-0 pl-(--field-inset) transition-[padding-left] duration-(--field-duration) ease-(--field-easing) motion-reduce:transition-none">
                <ZzzField
                  title={t("modDetails.source")}
                  className="pointer-events-auto"
                  content={
                    <input
                      className="w-full min-w-0 text-right font-bold placeholder:text-current placeholder:opacity-50"
                      placeholder={t("modDetails.unknownSource")}
                      value={localModInfo.source}
                      onChange={(e) => handleModInfoChange("source", e.target.value)}
                    />
                  }
                />
              </div>
            </div>
            <ToggleKeyEditor modName={modInfo.name} className={styles.toggles} />
            <textarea
              value={localModInfo.description}
              placeholder={t("modDetails.description")}
              className={clsx(
                styles.description,
                "no-scrollbar field-sizing-content w-full resize-none overflow-scroll rounded-2xl bg-black p-2 font-bold wrap-normal whitespace-pre-line text-white shadow-[1px_1px_1px_#fff2]"
              )}
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
          <ZzzButton type="Feedback" onClick={handleAutofill}>
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

      {alert}
    </>
  );
};

const DetailedModal = ({ isOpen, modInfo, onClose }: { isOpen: boolean; modInfo: ModInfo; onClose: () => void }) => (
  <ModalOverlay isOpen={isOpen} className="gap-2">
    <DetailedModalContent modInfo={modInfo} onClose={onClose} />
  </ModalOverlay>
);

export default DetailedModal;
