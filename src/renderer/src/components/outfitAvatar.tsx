import type { Character } from "@shared/character";

const avatars = import.meta.glob<string>("../assets/avatars/outfit_avatars/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
});

const OutfitAvatar = ({ character, outfitId }: { character: Character; outfitId: number | "All" }) => {
  const src = avatars[`../assets/avatars/outfit_avatars/${character}-${outfitId}.webp`];
  if (!src || outfitId === "All" || outfitId === 0) return null;

  return <img src={src} alt="" className="size-6 shrink-0 object-contain" draggable={false} />;
};

export default OutfitAvatar;
