import { useAppDispatch } from "@renderer/redux/hooks";
import { loadLibrary } from "@renderer/redux/slices/librarySlice";
import { useLocalStorage } from "@uidotdev/usehooks";

const BottomBar: React.FC = () => {
  const dispatch = useAppDispatch();
  const [libraryPath, setLibraryPath] = useLocalStorage("libraryPath", "");

  const handleOnClickSelectLibraryPath = async (): Promise<void> => {
    const newPath: string | null = await window.electron.ipcRenderer.invoke("select-library-path");
    if (newPath) {
      setLibraryPath(newPath);
      const mods = await window.electron.ipcRenderer.invoke("load-library", newPath);
      console.log("Loaded mods:", mods);
    }
  };

  const handleOnClickRefresh = async (): Promise<void> => {
    if (libraryPath) {
      dispatch(loadLibrary(libraryPath));
    }
  };

  return (
    <>
      <div className="fixed bottom-0 flex h-12 w-full gap-4 bg-cyan-800">
        <button className="rounded bg-cyan-600 px-4 py-2 font-bold text-white hover:bg-cyan-700">
          Settings
        </button>
        <button
          onClick={handleOnClickRefresh}
          className="rounded bg-cyan-600 px-4 py-2 font-bold text-white hover:bg-cyan-700"
        >
          Refresh
        </button>
        <button
          onClick={handleOnClickSelectLibraryPath}
          className="rounded bg-cyan-600 px-4 py-2 font-bold text-white hover:bg-cyan-700"
        >
          {libraryPath ? `Library: ${libraryPath}` : "Select Library Path..."}
        </button>
      </div>
    </>
  );
};

export default BottomBar;
