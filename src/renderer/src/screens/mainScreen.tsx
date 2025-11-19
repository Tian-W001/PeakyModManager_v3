import BottomBar from "../components/bottomBar";
import { useAppSelector } from "@renderer/redux/hooks";
import Menu from "@renderer/components/menu";
import ModCardGrid from "@renderer/components/modCardGrid";
import CharacterBar from "@renderer/components/characterBar";
import { selectModTypeFilteredModCards } from "@renderer/redux/selectors/ModCardsSelector";

const MainScreen: React.FC = () => {
  const selectedModInfos = useAppSelector(selectModTypeFilteredModCards);

  return (
    <div className="flex h-screen w-screen flex-col bg-[url('@renderer/assets/zzz_site_background.webp')]" id="main-screen">
      <div className="flex min-h-0 flex-1 flex-row" id="content-area">
        <Menu className="w-[350px]" />
        <div className="flex h-full flex-1 flex-col py-4" id="card-grid-area">
          <CharacterBar className="h-18 max-w-[80%]" />
          <ModCardGrid modInfos={selectedModInfos} className="h-full w-full flex-1" />
        </div>
      </div>
      <BottomBar className="h-18" />
    </div>
  );
};

export default MainScreen;
