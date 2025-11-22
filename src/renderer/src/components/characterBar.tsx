import clsx from "clsx";
import { Character, characterNameList } from "../../../shared/character";

const imageNameList = [...characterNameList, "All"] as const;
const imageModules = import.meta.glob("@renderer/assets/character_images/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;
const characterImageMap: Record<string, string> = {};
for (const path in imageModules) {
  const characterName = path.split("/").pop()?.replace(".png", "") || "Unknown";
  characterImageMap[characterName] = imageModules[path];
}

const getCharacterImageSrc = (character: Character | "All") => {
  return characterImageMap[character] || characterImageMap["Unknown"];
};

const CharacterBar = ({ className }: { className?: string }) => {
  const handleScroll = (event: React.WheelEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    const scrollAmount = event.deltaY;
    container.scrollTo({
      top: 0,
      left: container.scrollLeft + scrollAmount,
      behavior: "auto",
    });
  };

  return (
    <div className={clsx("flex items-center p-2", className)}>
      <div
        className="flex size-full flex-row items-center justify-between gap-4 rounded-full bg-slate-400 bg-linear-to-b from-[#3a3a3a] to-[#272727] px-4 py-1"
        id="character-bar-container"
      >
        <h1> {"<"} </h1>
        <div
          className="no-scrollbar flex h-full flex-1 -skew-x-[25.3deg] snap-x flex-row items-center justify-start overflow-x-scroll overflow-y-hidden rounded-[14px] border-4 bg-black shadow-[4px_1px_0px_#ffffff19,-4px_-1px_0px_#00000051]"
          id="character-bar-images-container"
          onWheel={handleScroll}
        >
          {imageNameList.toReversed().map((character) => (
            <div key={character} className="-mx-1 h-full shrink-0 snap-start -scroll-m-2" id="character-bar-image-container">
              <img src={getCharacterImageSrc(character)} alt={character} className="h-full skew-x-[25.3deg]" />
            </div>
          ))}
        </div>
        <h1> {">"} </h1>
      </div>
    </div>
  );
};

export default CharacterBar;
