import BottomBar from "../components/bottomBar";
import { useAppSelector } from "@renderer/redux/hooks";
import Menu from "@renderer/components/menu";
import ModCardGrid from "@renderer/components/modCardGrid";
import CharacterBar from "@renderer/components/characterBar";
import { selectModTypeFilteredModCards } from "@renderer/redux/selectors/ModCardsSelector";
import { selectSelectedMenuItem } from "@renderer/redux/slices/uiSlice";

const MainScreen: React.FC = () => {
  const selectedModInfos = useAppSelector(selectModTypeFilteredModCards);
  const selectedMenuItem = useAppSelector(selectSelectedMenuItem);

  return (
    <div
      className="relative flex h-screen w-screen flex-col overflow-hidden before:absolute before:inset-0 before:-z-10 before:scale-104 before:bg-[url('@renderer/assets/wallpapers/zzz_wallpaper_0.jpg')] before:bg-cover before:blur-sm"
      id="main-screen"
    >
      <div className="flex min-h-0 flex-1 flex-row" id="content-area">
        <Menu className="w-[280px]" />
        <div className="flex h-full flex-1 flex-col overflow-hidden pt-4" id="card-grid-area">
          {selectedMenuItem === "Character" && <CharacterBar className="h-18 max-w-[80%]" />}
          <ModCardGrid modInfos={selectedModInfos} className="min-h-0 w-full flex-1" />
        </div>
      </div>
      <BottomBar className="h-18" />
    </div>
  );
};

export default MainScreen;
