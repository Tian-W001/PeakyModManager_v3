import BottomBar from "../components/bottomBar";
import { useAppSelector } from "@renderer/redux/hooks";
import { selectModInfos } from "@renderer/redux/slices/librarySlice";
import Menu from "@renderer/components/menu";
import ModCardGrid from "@renderer/components/modCardGrid";

const MainScreen: React.FC = () => {
  const modInfos = useAppSelector(selectModInfos);
  return (
    <div className="flex h-screen w-screen flex-col" id="main-screen">
      <div className="flex min-h-0 flex-1 flex-row" id="content-area">
        <Menu className="w-100" />
        <ModCardGrid modInfos={modInfos} className="h-full w-full" />
      </div>
      <BottomBar className="h-12" />
    </div>
  );
};

export default MainScreen;
