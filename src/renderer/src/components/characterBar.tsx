import { useLayoutEffect, useRef } from "react";
import clsx from "clsx";
import { Character, characterNameList } from "../../../shared/character";
import charActiveMask from "@renderer/assets/character_active_mask.png";
import { useAppDispatch, useAppSelector } from "@renderer/redux/hooks";
import { selectSelectedCharacter, setSelectedCharacter } from "@renderer/redux/slices/uiSlice";
import { TiChevronLeft, TiChevronRight } from "react-icons/ti";

const getCharacterImagePath = (char: Character | "All") => {
  return new URL(`../assets/character_images/${char}.png`, import.meta.url).href;
};

const CharacterBar = ({ className }: { className?: string }) => {
  const dispatch = useAppDispatch();
  const selectedCharacter = useAppSelector(selectSelectedCharacter);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const selectedCharBlockRef = useRef<HTMLDivElement>(null);
  const characterBarImageList: (Character | "All")[] = [...characterNameList, "All"].toReversed() as (
    | Character
    | "All"
  )[];

  useLayoutEffect(() => {
    const target = selectedCharBlockRef.current;
    const container = scrollContainerRef.current;
    if (!target || !container) return;
    const scrollToPosition = target.offsetLeft - container.clientWidth / 2 + target.clientWidth / 2;
    container.scrollTo({
      left: scrollToPosition,
      behavior: "smooth",
    });
  }, []);

  const handleScroll = (event: React.WheelEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    const scrollAmount = event.deltaY;
    container.scrollTo({
      top: 0,
      left: container.scrollLeft + scrollAmount,
      behavior: "auto",
    });
  };

  const handleScrollLeft = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      container.scrollTo({
        top: 0,
        left: 0,
        behavior: "smooth",
      });
    }
  };

  const handleScrollRight = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      container.scrollTo({
        top: 0,
        left: container.scrollWidth - container.clientWidth,
        behavior: "smooth",
      });
    }
  };

  const handleSelectCharacter = (character: Character | "All") => {
    dispatch(setSelectedCharacter(character));
  };

  return (
    <div className={clsx("flex items-center", className)}>
      <div
        className="flex size-full shrink-0 flex-row items-center justify-between gap-4 overflow-hidden rounded-full border-2 bg-linear-to-b from-[#3a3a3a] to-[#272727] px-4 py-1"
        id="character-bar-container"
      >
        <TiChevronLeft
          onClick={handleScrollLeft}
          className="hover:text-zzzYellow h-full scale-200 text-[#111] drop-shadow-[1px_0px_0px_#ffffff19] transition-colors"
        />
        <div
          ref={scrollContainerRef}
          className="no-scrollbar flex h-full flex-1 -skew-x-[25.3deg] snap-x flex-row items-center justify-start overflow-x-scroll overflow-y-hidden rounded-[14px] border-4 bg-black shadow-[4px_1px_0px_#ffffff19,-4px_-1px_0px_#00000051]"
          id="character-bar-images-container"
          onWheel={handleScroll}
        >
          {characterBarImageList.map((char) => (
            <div
              key={char}
              ref={char === selectedCharacter ? selectedCharBlockRef : null}
              className="-mx-1 h-full shrink-0 snap-start -scroll-m-1"
              onClick={() => handleSelectCharacter(char)}
            >
              {selectedCharacter === char && (
                <img
                  src={charActiveMask}
                  alt="active mask"
                  loading="lazy"
                  className="fixed z-10 h-full skew-x-[25.3deg]"
                />
              )}
              <img
                src={getCharacterImagePath(char)}
                onError={(e) => (e.currentTarget.src = getCharacterImagePath("Unknown"))}
                alt={char}
                loading="lazy"
                className="aspect-[calc(8/3)] h-full skew-x-[25.3deg]" // images are 160:60
              />
            </div>
          ))}
        </div>
        <TiChevronRight
          onClick={handleScrollRight}
          className="hover:text-zzzYellow h-full scale-200 text-[#111] drop-shadow-[1px_0px_0px_#ffffff19] transition-colors"
        />
      </div>
    </div>
  );
};

export default CharacterBar;
