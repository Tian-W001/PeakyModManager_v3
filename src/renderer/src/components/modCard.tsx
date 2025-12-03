import { useState } from "react";
import { ModInfo } from "src/shared/modInfo";
import DetailedModal from "../modal/detailedModal";
import { createPortal } from "react-dom";
import { ModState } from "@shared/modState";
import { useAppDispatch, useAppSelector } from "@renderer/redux/hooks";
import { addToDiffList, selectModDiffState, selectModIsEnabled } from "@renderer/redux/slices/presetsSlice";
import SmoothCornerPatch from "./CurvePatch";
import defaultCover from "@renderer/assets/default_cover.jpg";
import { useTranslation } from "react-i18next";
import { useIntersectionObserver } from "@uidotdev/usehooks";

// Load avatar images
const modTypeImages = import.meta.glob("../assets/avatars/modType_avatars/*", { eager: true });
const characterImages = import.meta.glob("../assets/avatars/character_avatars/*", { eager: true });
const getFileName = (path: string) => path.split("/").pop()?.split(".")[0];
const modTypeMap: Record<string, string> = {};
for (const path in modTypeImages) {
  const name = getFileName(path);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (name) modTypeMap[name] = (modTypeImages[path] as any).default;
}
const characterMap: Record<string, string> = {};
for (const path in characterImages) {
  const name = getFileName(path);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (name) characterMap[name] = (characterImages[path] as any).default;
}
const getAvatarUrl = (modInfo: ModInfo) => {
  if (modInfo.modType === "Character" && modInfo.character && characterMap[modInfo.character]) {
    return characterMap[modInfo.character];
  }
  if (modTypeMap[modInfo.modType]) {
    return modTypeMap[modInfo.modType];
  }

  return modTypeMap["Unknown"];
};

const R = 24; // Avatar Radius
const r = 30; // Fillet Radius

const getBorderStyle = (modState: ModState) => {
  switch (modState) {
    case "Enabled":
      return "outline-zzzYellow outline-4";
    case "Disabled":
      return "outline-2";
    case "WillEnable":
      return "outline-zzzYellow outline-dotted outline-4";
    case "WillDisable":
      return "outline-red-400 outline-dotted outline-4";
    default:
      return "";
  }
};

const ModCard = ({ modInfo }: { modInfo: ModInfo }) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isEnabledInPreset = useAppSelector(selectModIsEnabled(modInfo.name));
  const diffEntry = useAppSelector(selectModDiffState(modInfo.name));
  const currentModState: ModState =
    diffEntry !== null ? (diffEntry ? "WillEnable" : "WillDisable") : isEnabledInPreset ? "Enabled" : "Disabled";

  const [ref, entry] = useIntersectionObserver({
    threshold: 0,
    root: null,
    rootMargin: "0px",
  });

  const handleOnRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsModalOpen(true);
  };

  const handleOnClick = () => {
    if (currentModState === "Enabled" || currentModState === "WillEnable") {
      dispatch(addToDiffList({ [modInfo.name]: false })); // Enabled -> WillDisable, WillEnable -> Disabled
    } else {
      dispatch(addToDiffList({ [modInfo.name]: true })); //  Disabled -> WillEnable, WillDisable -> Enabled
    }
  };

  return (
    <>
      <div
        ref={ref}
        onClick={handleOnClick}
        onContextMenu={handleOnRightClick}
        className={`${getBorderStyle(currentModState)} flex aspect-2/3 h-[350px] flex-col items-center overflow-hidden rounded-[30px_0] bg-[#333]`}
      >
        {entry?.isIntersecting && (
          <>
            <img
              src={`${`mod-image://local/${modInfo.name}/${modInfo.coverImage}`}`}
              alt={modInfo.name}
              className="min-h-[55%] w-full object-cover"
              onError={(e) => (e.currentTarget.src = defaultCover)}
            />
            <div className="flex w-full flex-1 flex-col">
              <div className="flex flex-row items-center">
                <div className="relative flex flex-col items-center justify-start">
                  <SmoothCornerPatch R={R + 2} r={r} color="#333" className="-translate-y-full" />
                  <img
                    src={getAvatarUrl(modInfo)}
                    alt="Avatar"
                    className={`absolute aspect-square -translate-y-[50%] rounded-full bg-blue-500 ring-2 ring-[#333]`}
                    style={{ width: 2 * R }}
                  />
                </div>
                <span className={`mr-4 -ml-4 flex-1 font-bold text-[#666] shadow-[0_2px_0_#666]`}>
                  {modInfo.modType === "Character"
                    ? t(`characters.nicknames.${modInfo.character}`)
                    : t(`modTypes.${modInfo.modType}`)}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-3 py-1.5">
                <h2 className="text-xl font-bold text-white">{modInfo.name}</h2>
                <p className="text-s flex-1 overflow-auto border font-bold whitespace-pre-line text-[#888]">
                  {modInfo.description || t("modCard.noDescription")}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
      {isModalOpen &&
        createPortal(<DetailedModal modInfo={modInfo} onClose={() => setIsModalOpen(false)} />, document.body)}
    </>
  );
};

export default ModCard;
