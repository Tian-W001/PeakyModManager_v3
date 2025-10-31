import ModCardGrid from "@renderer/components/modCardGrid";
import BottomBar from "./bottomBar";
import { useAppSelector } from "@renderer/redux/hooks";
import { selectModInfos } from "@renderer/redux/slices/librarySlice";

const MainScreen: React.FC = () => {
  const modInfos = useAppSelector(selectModInfos);
  return (
    <div className="fixed top-0 right-0 bottom-0 left-0 overflow-auto">
      <ModCardGrid modInfos={modInfos} />
      <BottomBar />
    </div>
  );
};

export default MainScreen;
