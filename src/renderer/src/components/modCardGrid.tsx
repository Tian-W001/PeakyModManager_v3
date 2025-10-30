import { ModInfo } from "src/types/modInfo";
import ModCard from "./modCard";

const ModCardGrid = ({ modInfos }: { modInfos: ModInfo[] }) => {
  return (
    <>
      <div className="flex flex-wrap gap-4 p-4">
        {modInfos.map((modInfo) => (
          <ModCard key={modInfo.name} modInfo={modInfo} />
        ))}
      </div>
    </>
  );
};

export default ModCardGrid;
