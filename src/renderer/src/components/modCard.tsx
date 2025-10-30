import { ModInfo } from "src/types/modInfo";

const ModCard = ({ modInfo }: { modInfo: ModInfo }) => {
  return (
    <>
      <div className="h-[300px] w-[200px] rounded-xl bg-amber-600">
        {modInfo.name || "Unnamed Mod"}
      </div>
    </>
  );
};

export default ModCard;
