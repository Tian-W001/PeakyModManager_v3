import { memo, useEffect, useRef } from "react";
import clsx from "clsx";
import { Character } from "../../../shared/character";
import charActiveMask from "@renderer/assets/character_active_mask.png";
import { useAppDispatch, useAppSelector } from "@renderer/redux/hooks";
import { selectSelectedCharacter, setSelectedCharacter } from "@renderer/redux/slices/uiSlice";
import { TiChevronLeft, TiChevronRight } from "react-icons/ti";
import { characterBarImageList, getCharacterImagePath } from "@renderer/utils/characterImages";

const CharacterBarItem = memo(
  ({
    char,
    isSelected,
    onSelect,
  }: {
    char: Character | "All";
    isSelected: boolean;
    onSelect: (character: Character | "All") => void;
  }) => (
    <div
      className="relative -ml-1.25 aspect-8/3 h-full shrink-0 snap-start -scroll-m-1 overflow-hidden" // images are 160:60
      onClick={() => onSelect(char)}
      data-character={char}
    >
      <img
        src={getCharacterImagePath(char)}
        onError={(e) => (e.currentTarget.src = getCharacterImagePath("Unknown"))}
        alt={char}
        loading="lazy"
        decoding="async"
        className="h-full skew-x-[25.3deg]"
      />
      {isSelected && (
        <img
          src={charActiveMask}
          alt="active mask"
          loading="lazy"
          decoding="async"
          className="absolute top-0 z-10 h-full skew-x-[25.3deg]"
        />
      )}
    </div>
  )
);
CharacterBarItem.displayName = "CharacterBarItem";

const CharacterBar = ({ className, isVisible }: { className?: string; isVisible: boolean }) => {
  const dispatch = useAppDispatch();
  const selectedCharacter = useAppSelector(selectSelectedCharacter);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const wasVisibleRef = useRef(false);

  useEffect(() => {
    const becameVisible = isVisible && !wasVisibleRef.current;
    wasVisibleRef.current = isVisible;
    if (!becameVisible) return;

    const container = scrollContainerRef.current;
    if (!container) return;
    const frameId = requestAnimationFrame(() => {
      const target = container.querySelector<HTMLElement>(`[data-character="${selectedCharacter}"]`);
      if (!target) return;
      const scrollToPosition = target.offsetLeft - container.clientWidth / 2 + target.clientWidth / 2;
      container.scrollTo({
        left: scrollToPosition,
        behavior: "auto",
      });
    });
    return () => cancelAnimationFrame(frameId);
  }, [isVisible, selectedCharacter]);

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
            <CharacterBarItem
              key={char}
              char={char}
              isSelected={selectedCharacter === char}
              onSelect={handleSelectCharacter}
            />
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
