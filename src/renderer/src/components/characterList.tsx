import clsx from "clsx";

//import all images in assets/character_images
const characters = [
  "Unknown",
  "Belle",
  "Wise",
  "Anby",
  "Billy",
  "Nicole",
  "Nekomata",
  "Koleda",
  "Ben",
  "Grace",
  "Anton",
  "Lycaon",
  "Rina",
  "Corin",
  "Soldier11",
  "Soukaku",
  "Lucy",
  "Piper",
  "Ellen",
  "ZhuYuan",
  "Qingyi",
  "Jane",
  "Seith",
  "Caesar",
  "Burnice",
  "Yanagi",
  "Lighter",
  "Harumasa",
  "Miyabi",
  "Astra",
  "Evelyn",
  "Pulchra",
  "Anby0",
  "Trigger",
  "Hugo",
  "Vivian",
  "YiXuan",
  "PanYinhu",
  "JuFufu",
  "Yuzuha",
  "Alice",
  "Seed",
  "Orphie",
  "Lucia",
  "Manato",
  "Yidhari",
  "Dialyn",
  "Banyue",
];
const imageModules = import.meta.glob("@renderer/assets/character_images/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;
const characterImageMap: Record<string, string> = {};
for (const path in imageModules) {
  const characterName = path.split("/").pop()?.replace(".png", "") || "Unknown";
  characterImageMap[characterName] = imageModules[path];
}

const getCharacterImageSrc = (character: string) => {
  return characterImageMap[character] || characterImageMap["Unknown"];
};

const CharacterList = ({ className }: { className?: string }) => {
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
    <div className={clsx("flex items-center bg-red-200 p-2", className)}>
      <div className="flex size-full flex-row items-center justify-between gap-4 rounded-full bg-slate-400 px-4 py-1" id="character-list-container">
        <h1> {"<"} </h1>
        <div
          className="no-scrollbar flex h-full flex-1 -skew-x-[25.3deg] snap-x flex-row items-center justify-start overflow-x-scroll overflow-y-hidden rounded-[14px] bg-black py-1 *:first:pl-0.5 *:last:pr-0.5"
          id="character-list-images-container"
          onWheel={handleScroll}
        >
          {characters.toReversed().map((character) => (
            <div key={character} className="-mx-1 h-full shrink-0 snap-start -scroll-m-0.5" id="character-image-container">
              <img src={getCharacterImageSrc(character)} alt={character} className="h-full skew-x-[25.3deg]" />
            </div>
          ))}
        </div>
        <h1> {">"} </h1>
      </div>
    </div>
  );
};

export default CharacterList;
