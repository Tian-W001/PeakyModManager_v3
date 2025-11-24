import BottomBar from "../components/bottomBar";
import { useAppDispatch, useAppSelector } from "@renderer/redux/hooks";
import Menu from "@renderer/components/menu";
import ModCardGrid from "@renderer/components/modCardGrid";
import CharacterBar from "@renderer/components/characterBar";
import { selectModTypeFilteredModCards } from "@renderer/redux/selectors/ModCardsSelector";
import { selectSelectedMenuItem } from "@renderer/redux/slices/uiSlice";
import { useState } from "react";
import { ModState } from "@shared/modState";
import { applyMods } from "@renderer/redux/slices/presetsSlice";

const MainScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const selectedModInfos = useAppSelector(selectModTypeFilteredModCards);
  const selectedMenuItem = useAppSelector(selectSelectedMenuItem);

  const [diffList, setDiffList] = useState<{ modName: string; newState: ModState }[]>([]);

  const appendToDiffList = (modName: string, newState: Extract<ModState, "Enabled" | "Disabled">) => {
    //before appending, check if modName already exists in diffList,
    //if it does, and newState is opposite of existing state, remove it from diffList
    setDiffList((prevDiffList) => {
      const existingIndex = prevDiffList.findIndex((item) => item.modName === modName);
      if (existingIndex !== -1) {
        const existingItem = prevDiffList[existingIndex];
        if (existingItem.newState !== newState) {
          const newDiffList = [...prevDiffList];
          newDiffList.splice(existingIndex, 1);
          return newDiffList;
        } else {
          return prevDiffList;
        }
      } else {
        return [...prevDiffList, { modName, newState }];
      }
    });
  };

  const handleApplyChanges = async () => {
    const modsToApply = diffList.map((diff) => ({
      modName: diff.modName,
      enabled: diff.newState === "Enabled",
    }));
    dispatch(applyMods(modsToApply));
    await window.electron.ipcRenderer.invoke("apply-mod-changes", modsToApply);
    setDiffList([]);
  };

  return (
    <div
      className="flex h-screen w-screen flex-col bg-[url('@renderer/assets/zzz_site_background.webp')]"
      id="main-screen"
    >
      <div className="flex min-h-0 flex-1 flex-row" id="content-area">
        <Menu className="w-[350px]" />
        <div className="flex h-full flex-1 flex-col overflow-hidden py-4" id="card-grid-area">
          {selectedMenuItem === "Character" && <CharacterBar className="h-18 max-w-[80%]" />}
          <ModCardGrid
            modInfos={selectedModInfos}
            diffList={diffList}
            appendToDiffList={appendToDiffList}
            className="min-h-0 w-full flex-1"
          />
        </div>
      </div>
      <BottomBar diffList={diffList} onApplyChanges={handleApplyChanges} className="h-18" />
    </div>
  );
};

export default MainScreen;
