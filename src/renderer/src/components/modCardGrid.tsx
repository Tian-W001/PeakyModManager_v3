import { ModInfo } from "src/shared/modInfo";
import ModCard from "./modCard";
import clsx from "clsx";

const ModCardGrid = ({ modInfos, className }: { modInfos: ModInfo[]; className?: string }) => {
  // const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
  //   event.preventDefault();
  // };

  // const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
  //   event.preventDefault();
  //   const files = event.dataTransfer.files;
  //   // Handle the dropped files here
  //   console.log("Dropped files:", files);
  // };

  return (
    <>
      <div className={clsx("flex flex-wrap items-start justify-start gap-4 overflow-x-hidden overflow-y-auto p-4 [scrollbar-gutter:stable]", className)}>
        {modInfos.map((modInfo) => (
          <ModCard key={modInfo.name} modInfo={modInfo} />
        ))}
      </div>
    </>
  );
};

export default ModCardGrid;
