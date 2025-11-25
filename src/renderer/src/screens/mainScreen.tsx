import BottomBar from "../components/bottomBar";
import { useAppDispatch, useAppSelector } from "@renderer/redux/hooks";
import Menu from "@renderer/components/menu";
import ModCardGrid from "@renderer/components/modCardGrid";
import CharacterBar from "@renderer/components/characterBar";
import { selectModTypeFilteredModCards } from "@renderer/redux/selectors/ModCardsSelector";
import { selectSelectedMenuItem } from "@renderer/redux/slices/uiSlice";
import { applyMods, selectCurrentPresetName, selectModNamesInCurrentPreset } from "@renderer/redux/slices/presetsSlice";
import { useDiffList } from "../hooks/useDiffList";
import { useEffect, useRef } from "react";

const MainScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const selectedModInfos = useAppSelector(selectModTypeFilteredModCards);
  const selectedMenuItem = useAppSelector(selectSelectedMenuItem);
  const currentPresetName = useAppSelector(selectCurrentPresetName);
  const currentPresetMods = useAppSelector(selectModNamesInCurrentPreset);

  const { diffList, appendToDiffList, clearDiffList } = useDiffList();
  const prevPresetNameRef = useRef(currentPresetName);

  useEffect(() => {
    if (prevPresetNameRef.current !== currentPresetName) {
      // Preset switched!
      const applyPreset = async () => {
        await window.electron.ipcRenderer.invoke("clear-target-path");
        const changes = currentPresetMods.map((modName) => ({
          modName,
          enable: true,
        }));
        await window.electron.ipcRenderer.invoke("apply-mods", changes);
      };
      applyPreset();
      clearDiffList();
      prevPresetNameRef.current = currentPresetName;
    }
  }, [currentPresetName, currentPresetMods, clearDiffList]);

  const handleApplyChanges = async () => {
    dispatch(applyMods(diffList));
    await window.electron.ipcRenderer.invoke("apply-mods", diffList);
    clearDiffList();
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
