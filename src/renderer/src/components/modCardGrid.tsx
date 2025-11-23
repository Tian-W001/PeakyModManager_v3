import { ModInfo } from "src/shared/modInfo";
import ModCard from "./modCard";
import clsx from "clsx";
import { ModState } from "@shared/modState";

const ModCardGrid = ({
  modInfos,
  diffList,
  appendToDiffList,
  className,
}: {
  modInfos: ModInfo[];
  diffList: { modName: string; newState: ModState }[];
  appendToDiffList: (modName: string, newState: Extract<ModState, "Enabled" | "Disabled">) => void;
  className?: string;
}) => {
  return (
    <>
      <div
        className={clsx(
          "flex flex-wrap items-start justify-start gap-4 overflow-x-hidden overflow-y-auto p-4 [scrollbar-color:#fff_#0000] [scrollbar-gutter:stable]",
          className
        )}
      >
        {modInfos.map((modInfo) => (
          <ModCard key={modInfo.name} modInfo={modInfo} diffList={diffList} appendToDiffList={appendToDiffList} />
        ))}
      </div>
    </>
  );
};

export default ModCardGrid;
