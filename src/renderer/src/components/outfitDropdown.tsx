import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import useMountTransition from "@renderer/hooks/useMountTransition";
import { getOutfitIds } from "@shared/outfit";
import { getOutfitIcon } from "@renderer/utils/outfitAvatars";
import { useAppDispatch, useAppSelector } from "@renderer/redux/hooks";
import { selectSelectedCharacter, selectSelectedOutfitId, setSelectedOutfitId } from "@renderer/redux/slices/uiSlice";
import ZzzButton from "./zzzButton";
import { ZzzSelectDropdown } from "./zzzSelect";

const OutfitDropdown = ({ isVisible }: { isVisible: boolean }) => {
  const dispatch = useAppDispatch();
  const selectedCharacter = useAppSelector(selectSelectedCharacter);
  const { t } = useTranslation();
  const selectedOutfitId = useAppSelector(selectSelectedOutfitId);
  const [toggleOutfitsMenu, shouldOutfitsMenuMount, shouldOutfitsMenuTransition] = useMountTransition(200);
  const outfitMenuRef = useRef<HTMLDivElement>(null);
  const outfitOptions = [
    { id: "All" as const, name: t("outfits.all"), icon: undefined },
    ...(selectedCharacter === "All"
      ? []
      : getOutfitIds(selectedCharacter).map((id) => ({
          id,
          name: t(id === 0 ? "outfits.none" : `characters.outfits.${selectedCharacter}.${id}`),
          icon: getOutfitIcon(selectedCharacter, id),
        }))),
  ];

  useEffect(() => {
    const closeOutside = (event: MouseEvent) => {
      if (outfitMenuRef.current && !outfitMenuRef.current.contains(event.target as Node)) toggleOutfitsMenu(false);
    };
    document.addEventListener("mousedown", closeOutside);
    return () => document.removeEventListener("mousedown", closeOutside);
  }, [toggleOutfitsMenu]);

  useEffect(() => {
    toggleOutfitsMenu(false);
  }, [selectedCharacter, isVisible, toggleOutfitsMenu]);

  return (
    <>
      {isVisible && selectedCharacter !== "All" && (
        <div ref={outfitMenuRef} className="">
          {shouldOutfitsMenuMount && (
            <ZzzSelectDropdown
              value={String(selectedOutfitId)}
              options={outfitOptions.map((option) => ({
                value: String(option.id),
                label: option.name,
                labelIcon: option.icon ? (
                  <img src={option.icon} alt="" className="h-8 shrink-0 rounded-sm object-fill" draggable={false} />
                ) : undefined,
              }))}
              isTransitioning={shouldOutfitsMenuTransition}
              className="w-60"
              onChange={(value) => {
                dispatch(setSelectedOutfitId(value === "All" ? "All" : Number(value)));
              }}
            />
          )}
          <ZzzButton type="Outfit" onClick={() => toggleOutfitsMenu()} className="h-80%" />
        </div>
      )}
    </>
  );
};

export default OutfitDropdown;
