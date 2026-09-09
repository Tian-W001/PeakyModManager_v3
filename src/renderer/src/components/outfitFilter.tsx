import { useEffect, useRef } from "react";
import clsx from "clsx";
import { FaCaretUp } from "react-icons/fa6";
import { useTranslation } from "react-i18next";
import type { Character } from "@shared/character";
import { getOutfitIds } from "@shared/outfit";
import { useAppDispatch, useAppSelector } from "@renderer/redux/hooks";
import { selectSelectedOutfitId, setSelectedOutfitId } from "@renderer/redux/slices/uiSlice";
import useMountTransition from "@renderer/hooks/useMountTransition";
import ZzzButton from "./zzzButton";
import OutfitAvatar from "./outfitAvatar";

const OutfitFilter = ({ character }: { character: Character }) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const selectedOutfitId = useAppSelector(selectSelectedOutfitId);
  const [toggleMenu, shouldMountMenu, shouldTransitionMenu] = useMountTransition(200);
  const containerRef = useRef<HTMLDivElement>(null);
  const options = [
    { id: "All" as const, name: t("outfits.all") },
    ...getOutfitIds(character).map((id) => ({
      id,
      name: t(id === 0 ? "outfits.none" : `characters.outfits.${character}.${id}`),
    })),
  ];
  const selectedName = options.find((option) => option.id === selectedOutfitId)?.name ?? t("outfits.all");

  useEffect(() => {
    const closeOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) toggleMenu(false);
    };
    document.addEventListener("mousedown", closeOutside);
    return () => document.removeEventListener("mousedown", closeOutside);
  }, [toggleMenu]);

  return (
    <div
      ref={containerRef}
      className="absolute bottom-4 left-8 flex w-60 max-w-[calc(50%-3rem)] flex-col items-start"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          toggleMenu(false);
          containerRef.current?.querySelector<HTMLButtonElement>(":scope > button")?.focus();
        }
      }}
    >
      {shouldMountMenu && (
        <div
          role="group"
          aria-label={t("outfits.label")}
          className={clsx(
            "no-scrollbar mb-2 flex max-h-60 w-full flex-col gap-2 overflow-x-hidden overflow-y-auto rounded-2xl bg-[#222] p-2 shadow-xl transition-[opacity_translate] duration-200 ease-in-out",
            shouldTransitionMenu
              ? "pointer-events-auto translate-y-0 opacity-100"
              : "pointer-events-none translate-y-[50%] opacity-0"
          )}
        >
          {options.map((option) => (
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
                toggleMenu(false);
              }}
            >
              <span className="min-w-0">{option.name}</span>
              <OutfitAvatar character={character} outfitId={option.id} />
            </button>
          ))}
        </div>
      )}
      <ZzzButton onClick={() => toggleMenu()} className="w-full shadow-xl">
        <div className="flex size-full items-center justify-between gap-2 overflow-hidden" title={selectedName}>
          <span className="min-w-0 flex-1 truncate text-left">{selectedName}</span>
          <OutfitAvatar character={character} outfitId={selectedOutfitId} />
          <FaCaretUp className={`shrink-0 transition-transform ${shouldMountMenu && "rotate-180"}`} />
        </div>
      </ZzzButton>
    </div>
  );
};

export default OutfitFilter;
