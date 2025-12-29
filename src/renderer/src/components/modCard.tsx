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
import { ModType } from "@shared/modType";
import { Character } from "@shared/character";
import useMountTransition from "@renderer/hooks/useMountTransition";

const getAvatarUrl = (modType: ModType, character?: Character) => {
  if (modType === "Character") {
    return new URL(`../assets/avatars/character_avatars/${character || "Unknown"}.png`, import.meta.url).href;
  } else {
    return new URL(`../assets/avatars/modType_avatars/${modType}.jpg`, import.meta.url).href;
  }
};

const R = 24; // Avatar Radius
const r = 30; // Fillet Radius

const getBorderStyle = (modState: ModState) => {
  switch (modState) {
    case "Enabled":
      return "outline-zzzYellow outline-4";
    case "Disabled":
      return "outline-4 outline-black";
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
  const [toggleModal, shouldModalMount, isModalTransitioned] = useMountTransition(200);

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
    if (!shouldModalMount) toggleModal();
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
        id="mod-card-container"
        ref={ref}
        onClick={handleOnClick}
        onContextMenu={handleOnRightClick}
        className={`${getBorderStyle(currentModState)} flex aspect-2/3 h-87.5 flex-col items-center overflow-hidden rounded-[30px_0] bg-[#333] hover:[&>div]:h-[21%]`}
      >
        {entry?.isIntersecting && (
          <>
            <div className="w-full flex-1 overflow-hidden" id="mod-card-cover-container">
              <img
                id="mod-card-cover"
                src={`${`mod-image://local/${modInfo.name}/${modInfo.coverImage}`}`}
                alt={modInfo.name}
                className="size-full flex-1 object-cover"
                onError={(e) => (e.currentTarget.src = defaultCover)}
              />
            </div>
            <div id="mod-card-info-container" className="flex h-[50%] min-h-0 w-full flex-col transition-all ease-in">
              <div id="mod-card-info-header" className="flex flex-row items-center">
                <div id="mod-card-avatar" className="relative flex flex-col items-center justify-start">
                  <SmoothCornerPatch R={R + 2} r={r} color="#333" className="-translate-y-full" />
                  <img
                    id="mod-card-avatar"
                    src={getAvatarUrl(modInfo.modType, modInfo.character)}
                    onError={(e) => (e.currentTarget.src = getAvatarUrl("Unknown"))}
                    alt="Avatar"
                    className={`absolute aspect-square -translate-y-[50%] rounded-full bg-black ring-2 ring-[#333]`}
                    style={{ width: 2 * R }}
                  />
                </div>
                <span
                  id="mod-card-info-type"
                  className={`mr-4 -ml-4 flex-1 font-bold text-[#666] shadow-[0_2px_0_#666]`}
                >
                  {modInfo.modType === "Character"
                    ? t(`characters.nicknames.${modInfo.character}`)
                    : t(`modTypes.${modInfo.modType}`)}
                </span>
              </div>
              <div id="mod-card-info-body" className="flex min-h-0 flex-1 flex-col px-3 py-1.5">
                <h2 className="overflow-hidden text-xl font-bold text-ellipsis whitespace-nowrap text-white">
                  {modInfo.name}
                </h2>
                <p className="text-s flex-1 overflow-hidden font-bold whitespace-pre-wrap text-[#888]">
                  {modInfo.description || t("modCard.noDescription")}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
      {shouldModalMount &&
        createPortal(
          <DetailedModal
            modInfo={modInfo}
            onClose={() => toggleModal()}
            className={`transition-[opacity_scale] duration-200 ease-in-out ${isModalTransitioned ? "pointer-events-auto scale-y-100 opacity-100" : "pointer-events-none scale-y-0 opacity-0"}`}
          />,
          document.body
        )}
    </>
  );
};

export default ModCard;
