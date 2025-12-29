import BottomBar from "../components/bottomBar";
import { useAppSelector } from "@renderer/redux/hooks";
import Menu from "@renderer/components/menu";
import ModCardGrid from "@renderer/components/modCardGrid";
import CharacterBar from "@renderer/components/characterBar";
import { selectModTypeFilteredModCards } from "@renderer/redux/selectors/ModCardsSelector";
import { selectSelectedMenuItem, selectCurrentWallpaper } from "@renderer/redux/slices/uiSlice";
import InvertedBWFilter from "@renderer/components/invertedBWFilter";
import useMountTransition from "@renderer/hooks/useMountTransition";
import { useEffect } from "react";

const MainScreen: React.FC = () => {
  const selectedModInfos = useAppSelector(selectModTypeFilteredModCards);
  const selectedMenuItem = useAppSelector(selectSelectedMenuItem);
  const currentWallpaper = useAppSelector(selectCurrentWallpaper);

  const [toggleCharacterbarOpen, shouldCharacterbarMount, isCharacterbarTransitioned] = useMountTransition(200);
  useEffect(() => {
    toggleCharacterbarOpen(selectedMenuItem === "Character");
  }, [selectedMenuItem, toggleCharacterbarOpen]);

  const wallpaperUrl = new URL(`../assets/wallpapers/${currentWallpaper}`, import.meta.url).href;

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
          <div className="relative flex h-full flex-1 flex-col overflow-hidden" id="card-grid-area">
            {shouldCharacterbarMount && (
              <CharacterBar
                className={`absolute top-0 left-0 z-10 mt-4 h-14 w-full max-w-[80%] transition-transform duration-300 ease-out ${isCharacterbarTransitioned ? "translate-y-0" : "-translate-y-[calc(100%+16px)]"}`}
              />
            )}
            <ModCardGrid
              modInfos={selectedModInfos}
              className={`min-h-0 w-full flex-1 transition-[margin] duration-300 ease-out ${selectedMenuItem === "Character" ? "mt-18" : "mt-0"}`}
            />
          </div>
        </div>
        <BottomBar className="h-18" />
      </div>
      <InvertedBWFilter />
    </>
  );
};

export default MainScreen;
