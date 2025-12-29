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
  const characterBarImageList: (Character | "All")[] = [...characterNameList, "All"].toReversed() as (
    | Character
    | "All"
  )[];

  const handleScroll = (event: React.WheelEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    const scrollAmount = event.deltaY;
    container.scrollTo({
      top: 0,
      left: container.scrollLeft + scrollAmount,
      behavior: "auto",
    });
  };

  const handleSelectCharacter = (character: Character | "All") => {
    console.log("Selected character:", character);
    dispatch(setSelectedCharacter(character));
  };

  return (
    <div className={clsx("flex items-center", className)}>
      <div
        className="flex size-full shrink-0 flex-row items-center justify-between gap-4 rounded-full border-2 bg-linear-to-b from-[#3a3a3a] to-[#272727] px-4 py-1"
        id="character-bar-container"
      >
        <TiChevronLeft color="#111" className="h-full scale-200 drop-shadow-[1px_0px_0px_#ffffff19]" />
        <div
          className="no-scrollbar flex h-full flex-1 -skew-x-[25.3deg] snap-x flex-row items-center justify-start overflow-x-scroll overflow-y-hidden rounded-[14px] border-4 bg-black shadow-[4px_1px_0px_#ffffff19,-4px_-1px_0px_#00000051]"
          id="character-bar-images-container"
          onWheel={handleScroll}
        >
          {characterBarImageList.map((char) => (
            <div
              key={char}
              className="-mx-1 h-full shrink-0 snap-start -scroll-m-1"
              id="character-bar-image-container"
              onClick={() => handleSelectCharacter(char)}
            >
              {selectedCharacter === char && (
                <img src={charActiveMask} alt="active mask" className="fixed z-10 h-full skew-x-[25.3deg]" />
              )}
              <img
                src={getCharacterImagePath(char)}
                onError={(e) => (e.currentTarget.src = getCharacterImagePath("Unknown"))}
                alt={char}
                className="h-full skew-x-[25.3deg]"
              />
            </div>
          ))}
        </div>
        <TiChevronRight color="#111" className="h-full scale-200 drop-shadow-[1px_0px_0px_#ffffff19]" />
      </div>
    </div>
  );
};

export default CharacterBar;
