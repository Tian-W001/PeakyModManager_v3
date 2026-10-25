import BottomBar from "./components/bottomBar";
import { useAppSelector } from "@renderer/redux/hooks";
import Menu from "./components/menu";
import ModCardGrid from "./components/modCardGrid";
import CharacterBar from "./components/characterBar";
import { selectSelectedMenuItem, selectCurrentWallpaper } from "@renderer/redux/slices/uiSlice";
import InvertedBWFilter from "@renderer/components/invertedBWFilter";
import proxyCheering from "@renderer/assets/proxy_cheering.png";

const MainScreen: React.FC = () => {
  const selectedMenuItem = useAppSelector(selectSelectedMenuItem);
  const currentWallpaper = useAppSelector(selectCurrentWallpaper);

  const wallpaperUrl = new URL(`../../assets/wallpapers/${currentWallpaper}`, import.meta.url).href;
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
          <div className="group relative flex h-full flex-1 flex-col overflow-hidden" id="card-grid-area">
            <CharacterBar className="absolute top-0 left-0 z-10 mt-(--character-bar-offset) h-14 w-full max-w-[80%] [--character-bar-offset:1rem]" />
            <ModCardGrid
              className={`min-h-0 w-full flex-1 transition-[margin] duration-300 ease-out ${isCharacterMenu ? "mt-18" : "mt-0"}`}
            />
            <img
              src={proxyCheering}
              alt="Proxy Cheering"
              className="absolute right-4 bottom-0 z-10 w-80 transition-all duration-300 ease-out group-hover:translate-y-44"
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
