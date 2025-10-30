import ModCardGrid from "@renderer/components/modCardGrid";
import BottomBar from "./bottomBar";
import { useAppSelector } from "@renderer/redux/hooks";
import { selectModInfos } from "@renderer/redux/slices/librarySlice";

const MainScreen: React.FC = () => {
  const modInfos = useAppSelector(selectModInfos);
  return (
    <>
      <ModCardGrid modInfos={modInfos} />
      <BottomBar />
    </>
  );
};

export default MainScreen;
