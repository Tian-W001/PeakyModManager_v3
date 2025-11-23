import { useState } from "react";
import { ModInfo } from "src/shared/modInfo";
import DetailedModal from "./detailedModal";
import { createPortal } from "react-dom";
import { ModState } from "@shared/modState";
import { useAppSelector } from "@renderer/redux/hooks";
import { selectModIsEnabled } from "@renderer/redux/slices/presetsSlice";

const getBorderStyle = (modState: ModState) => {
  switch (modState) {
    case "Enabled":
      return "border-zzzYellow";
    case "Disabled":
      return "";
    case "WillEnable":
      return "border-zzzYellow border-dashed";
    case "WillDisable":
      return "border-red-400 border-dashed";
    default:
      return "";
  }
};

const ModCard = ({
  modInfo,
  diffList,
  appendToDiffList,
}: {
  modInfo: ModInfo;
  diffList: { modName: string; newState: ModState }[];
  appendToDiffList: (modName: string, newState: Extract<ModState, "Enabled" | "Disabled">) => void;
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isEnabledInPreset = useAppSelector(selectModIsEnabled(modInfo.name));

  const diffEntry = diffList.find((diff) => diff.modName === modInfo.name);
  const currentModState: ModState = diffEntry
    ? diffEntry.newState === "Enabled"
      ? "WillEnable"
      : "WillDisable"
    : isEnabledInPreset
      ? "Enabled"
      : "Disabled";

  // if (diffEntry) {
  //   currentModState = diffEntry.newState === "Enabled" ? "WillEnable" : "WillDisable";
  // } else {
  //   currentModState = isEnabledInPreset ? "Enabled" : "Disabled";
  // }

  const handleOnRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsModalOpen(true);
  };

  const handleOnClick = () => {
    if (currentModState === "Enabled" || currentModState === "WillEnable") {
      appendToDiffList(modInfo.name, "Disabled");
    } else {
      appendToDiffList(modInfo.name, "Enabled");
    }
  };

  return (
    <>
      <div
        onClick={handleOnClick}
        onContextMenu={handleOnRightClick}
        className={`${getBorderStyle(currentModState)} h-[300px] w-[200px] rounded-[30px_0] border-8 bg-blue-900`}
      >
        {modInfo.name || "Unnamed Mod"}
      </div>
      {isModalOpen &&
        createPortal(<DetailedModal modInfo={modInfo} onClose={() => setIsModalOpen(false)} />, document.body)}
    </>
  );
};

export default ModCard;
