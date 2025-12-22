import BottomBar from "../components/bottomBar";
import { useAppSelector } from "@renderer/redux/hooks";
import Menu from "@renderer/components/menu";
import ModCardGrid from "@renderer/components/modCardGrid";
import CharacterBar from "@renderer/components/characterBar";
import { selectModTypeFilteredModCards } from "@renderer/redux/selectors/ModCardsSelector";
import { selectSelectedMenuItem, selectCurrentWallpaper } from "@renderer/redux/slices/uiSlice";
import InvertedBWFilter from "@renderer/components/invertedBWFilter";

const wallpapers = import.meta.glob("@renderer/assets/wallpapers/*", { eager: true, query: "?url", import: "default" });

const MainScreen: React.FC = () => {
  const selectedModInfos = useAppSelector(selectModTypeFilteredModCards);
  const selectedMenuItem = useAppSelector(selectSelectedMenuItem);
  const currentWallpaper = useAppSelector(selectCurrentWallpaper);

  const wallpaperUrl =
    Object.entries(wallpapers).find(([path]) => path.endsWith(currentWallpaper))?.[1] || Object.values(wallpapers)[0];

  return (
    <>
      <div
        className="relative flex h-screen w-screen flex-col overflow-hidden before:absolute before:inset-0 before:-z-10 before:scale-104 before:bg-[url('@renderer/assets/wallpapers/zzz_wallpaper_0.jpg')] before:bg-cover before:blur-xs"
        id="main-screen"
      >
        <div
          className="absolute inset-0 -z-10 scale-105 bg-cover bg-center blur-sm"
          style={{ backgroundImage: `url('${wallpaperUrl}')` }}
        />
        <div className="flex min-h-0 flex-1 flex-row" id="content-area">
          <Menu className="w-70" />
          <div className="flex h-full flex-1 flex-col overflow-hidden pt-4" id="card-grid-area">
            {selectedMenuItem === "Character" && <CharacterBar className="h-18 max-w-[80%]" />}
            <ModCardGrid modInfos={selectedModInfos} className="min-h-0 w-full flex-1" />
          </div>
        </div>
        <BottomBar className="h-18" />
      </div>
      <InvertedBWFilter />
    </>
  );
};

export default MainScreen;
