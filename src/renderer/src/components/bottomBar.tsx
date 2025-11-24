import { useAppDispatch, useAppSelector } from "@renderer/redux/hooks";
import { loadLibrary, selectLibraryPath, setLibraryPath, setTargetPath } from "@renderer/redux/slices/librarySlice";
import { ModState } from "@shared/modState";
import { clsx } from "clsx";

const BottomBar = ({
  diffList,
  onApplyChanges,
  className,
}: {
  diffList: { modName: string; newState: ModState }[];
  onApplyChanges: () => void;
  className?: string;
}) => {
  const dispatch = useAppDispatch();
  const libraryPath = useAppSelector(selectLibraryPath);
  //const targetPath = useAppSelector(selectTargetPath);

  const handleOnClickSelectLibraryPath = async () => {
    const newPath: string | null = await window.electron.ipcRenderer.invoke("select-path");
    if (newPath) {
      dispatch(setLibraryPath(newPath));
    }
  };

  const handleOnClickSelectTargetPath = async () => {
    const newPath: string | null = await window.electron.ipcRenderer.invoke("select-path");
    if (newPath) {
      dispatch(setTargetPath(newPath));
    }
  };

  const handleOnClickRefresh = async () => {
    dispatch(loadLibrary(libraryPath));
  };

  return (
    <>
      <div className={clsx("flex w-full justify-start gap-8 bg-black px-8 py-3.5", className)} id="bottom-bar">
        <button className="">Settings</button>
        <button className="" onClick={handleOnClickRefresh}>
          Refresh
        </button>
        <button className="" onClick={handleOnClickSelectLibraryPath}>
          Select Library
        </button>
        <button className="" onClick={handleOnClickSelectTargetPath}>
          Select Target Dir
        </button>
        <button className="bg-zzzYellow rounded px-4 text-black" onClick={onApplyChanges}>
          Apply {diffList.length ? `(${diffList.length})` : ""}
        </button>
      </div>
    </>
  );
};

export default BottomBar;
