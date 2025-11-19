import { useState } from "react";
import { ModInfo } from "src/types/modInfo";
import DetailedModal from "./detailedModal";
import { createPortal } from "react-dom";

const ModCard = ({ modInfo }: { modInfo: ModInfo }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOnRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsModalOpen(true);
  };

  return (
    <>
      <div onContextMenu={handleOnRightClick} className="h-[300px] w-[200px] rounded-[30px_0] bg-amber-600">
        {modInfo.name || "Unnamed Mod"}
      </div>
      {isModalOpen && createPortal(<DetailedModal modInfo={modInfo} onClose={() => setIsModalOpen(false)} />, document.body)}
    </>
  );
};

export default ModCard;
