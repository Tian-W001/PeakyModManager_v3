import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import useMountTransition from "@renderer/hooks/useMountTransition";
import { getOutfitCount, getOutfitIds } from "@shared/outfit";
import { getOutfitIcon } from "@renderer/utils/outfitImages";
import { useAppDispatch, useAppSelector } from "@renderer/redux/hooks";
import { selectSelectedCharacter, selectSelectedOutfitId, setSelectedOutfitId } from "@renderer/redux/slices/uiSlice";
import ZzzButton from "./zzzButton";

const OutfitDropdown = ({ isVisible }: { isVisible: boolean }) => {
  const dispatch = useAppDispatch();
  const selectedCharacter = useAppSelector(selectSelectedCharacter);
  const { t } = useTranslation();
  const selectedOutfitId = useAppSelector(selectSelectedOutfitId);
  const [toggleOutfitsMenu, shouldOutfitsMenuMount, shouldOutfitsMenuTransition] = useMountTransition(200);
  const outfitMenuRef = useRef<HTMLDivElement>(null);
  const outfitOptions = [
    { id: "All" as const, name: t("outfits.all"), icon: undefined },
    ...(selectedCharacter === "All" ? [] : getOutfitIds(selectedCharacter)).map((id) => ({
      id,
      name: t(id === 0 ? "outfits.none" : `characters.outfits.${selectedCharacter}.${id}`),
      icon: selectedCharacter === "All" ? undefined : getOutfitIcon(selectedCharacter, id),
    })),
  ];
  const selectedOutfitName = outfitOptions.find((option) => option.id === selectedOutfitId)?.name ?? t("outfits.all");

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
      {isVisible && selectedCharacter !== "All" && getOutfitCount(selectedCharacter) > 1 && (
        <div ref={outfitMenuRef} className="">
          {shouldOutfitsMenuMount && (
            <div
              role="group"
              aria-label={t("outfits.label")}
              className={clsx(
                "no-scrollbar absolute top-full right-0 z-20 mt-2 flex max-h-60 w-60 flex-col gap-2 overflow-x-hidden overflow-y-auto rounded-2xl bg-[#222] p-2 shadow-xl transition-[opacity_translate] duration-200 ease-in-out",
                shouldOutfitsMenuTransition
                  ? "pointer-events-auto translate-y-0 opacity-100"
                  : "pointer-events-none -translate-y-2 opacity-0"
              )}
            >
              {outfitOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={option.id === selectedOutfitId}
                  className={clsx(
                    "hover:bg-zzzYellow flex min-h-10 shrink-0 cursor-pointer items-center justify-between gap-2 rounded-xl p-2 text-left wrap-break-word hover:text-black",
                    option.id === selectedOutfitId ? "text-zzzYellow" : "text-white"
                  )}
                  onClick={() => {
                    dispatch(setSelectedOutfitId(option.id));
                    toggleOutfitsMenu(false);
                  }}
                >
                  <span className="min-w-0">{option.name}</span>
                  {option.icon && (
                    <img
                      src={option.icon}
                      alt=""
                      className="h-8 shrink-0 rounded-sm object-contain"
                      draggable={false}
                    />
                  )}
                </button>
              ))}
            </div>
          )}
          <ZzzButton
            type="Outfit"
            aria-label={t("outfits.label")}
            aria-expanded={shouldOutfitsMenuMount}
            title={t("outfits.label") + ": " + selectedOutfitName}
            onClick={() => toggleOutfitsMenu()}
            className={clsx("h-80%")}
          />
        </div>
      )}
    </>
  );
};

export default OutfitDropdown;
