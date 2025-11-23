import { useAppDispatch, useAppSelector } from "@renderer/redux/hooks";
import { loadLibrary, selectLibraryPath, setLibraryPath } from "@renderer/redux/slices/librarySlice";
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

  const handleOnClickSelectLibraryPath = async () => {
    const newPath: string | null = await window.electron.ipcRenderer.invoke("select-library-path");
    if (newPath) {
      dispatch(setLibraryPath(newPath));
      const mods = await window.electron.ipcRenderer.invoke("load-library", newPath);
      console.log("Loaded mods:", mods);
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
          {libraryPath ? `Library: ${libraryPath}` : "Select Library Path"}
        </button>
        {diffList.length > 0 && (
          <button className="bg-zzzYellow rounded px-4 text-black" onClick={onApplyChanges}>
            Apply Changes ({diffList.length})
          </button>
        )}
      </div>
    </>
  );
};

export default BottomBar;
