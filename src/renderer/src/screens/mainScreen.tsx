import BottomBar from "../components/bottomBar";
import { useAppSelector } from "@renderer/redux/hooks";
import Menu from "@renderer/components/menu";
import ModCardGrid from "@renderer/components/modCardGrid";
import CharacterBar from "@renderer/components/characterBar";
import { selectModTypeFilteredModCards } from "@renderer/redux/selectors/ModCardsSelector";
import { selectSelectedMenuItem, selectCurrentWallpaper } from "@renderer/redux/slices/uiSlice";
import InvertedBWFilter from "@renderer/components/invertedBWFilter";
import { useEffect } from "react";
import { preloadCharacterBarImages } from "@renderer/utils/characterImages";

const MainScreen: React.FC = () => {
  const selectedModInfos = useAppSelector(selectModTypeFilteredModCards);
  const selectedMenuItem = useAppSelector(selectSelectedMenuItem);
  const currentWallpaper = useAppSelector(selectCurrentWallpaper);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      preloadCharacterBarImages();
    }, 500);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const wallpaperUrl = new URL(`../assets/wallpapers/${currentWallpaper}`, import.meta.url).href;
  const isCharacterMenu = selectedMenuItem === "Character";

  return (
    <>
      <div
        className="relative flex h-screen w-screen flex-col overflow-hidden before:absolute before:inset-0 before:-z-10 before:scale-104 before:bg-[url('@renderer/assets/wallpapers/zzz_wallpaper_0.jpg')] before:bg-cover"
        id="main-screen"
      >
        <div
          className="absolute inset-0 -z-10 scale-105 bg-cover bg-center blur-sm"
          style={{ backgroundImage: `url('${wallpaperUrl}')` }}
        />
        <div className="flex min-h-0 flex-1 flex-row" id="content-area">
          <Menu className="w-70" />
          <div className="relative flex h-full flex-1 flex-col overflow-hidden" id="card-grid-area">
            <CharacterBar
              isVisible={isCharacterMenu}
              className={`absolute top-0 left-0 z-10 mt-4 h-14 w-full max-w-[80%] transition-[opacity_translate] duration-150 ease-out ${isCharacterMenu ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-[calc(100%+16px)] opacity-0"}`}
            />
            <ModCardGrid
              modInfos={selectedModInfos}
              className={`min-h-0 w-full flex-1 transition-[margin] duration-300 ease-out ${isCharacterMenu ? "mt-18" : "mt-0"}`}
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
