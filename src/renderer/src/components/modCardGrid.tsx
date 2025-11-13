import { ModInfo } from "src/types/modInfo";
import ModCard from "./modCard";
import clsx from "clsx";

const ModCardGrid = ({ modInfos, className }: { modInfos: ModInfo[]; className?: string }) => {
  return (
    <>
      <div
        className={clsx(
          "flex flex-wrap items-start justify-start gap-4 overflow-x-hidden overflow-y-auto bg-blue-200 p-4 [scrollbar-gutter:stable]",
          className
        )}
      >
        {modInfos.map((modInfo) => (
          <ModCard key={modInfo.name} modInfo={modInfo} />
        ))}
      </div>
    </>
  );
};

export default ModCardGrid;
