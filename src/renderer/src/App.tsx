import { useEffect } from "react";
import MainScreen from "./screens/mainScreen";
import { useAppDispatch, useAppSelector } from "./redux/hooks";
import { Toaster, toast } from "react-hot-toast";
import { selectLibraryPath, selectTargetPath } from "./redux/slices/librarySlice";

function App(): React.JSX.Element {
  const dispatch = useAppDispatch();

  /* Listeners for mod download events from main process */
  useEffect(() => {
    window.electron.ipcRenderer.on("downloading-mod", (_, { modName }) => {
      toast.loading(`Downloading ${modName}...`, { id: modName });
    });

    window.electron.ipcRenderer.on("unzipping-mod", (_, { modName }) => {
      toast.loading(`unzipping ${modName}...`, { id: modName });
    });

    window.electron.ipcRenderer.on("download-mod-error", (_, { modName, error }) => {
      toast.error(`Error downloading ${modName}: ${error}`, { id: modName });
    });

    return () => {
      window.electron.ipcRenderer.removeAllListeners("downloading-mod");
      window.electron.ipcRenderer.removeAllListeners("unzipping-mod");
      window.electron.ipcRenderer.removeAllListeners("download-mod-error");
    };
  }, [dispatch]);

  const libraryPath = useAppSelector(selectLibraryPath);
  const targetPath = useAppSelector(selectTargetPath);

  /* Sync libraryPath and targetPath to main process */
  useEffect(() => {
    if (libraryPath) {
      window.electron.ipcRenderer.invoke("set-library-path", libraryPath);
    }
  }, [libraryPath]);
  useEffect(() => {
    if (targetPath) {
      window.electron.ipcRenderer.invoke("set-target-path", targetPath);
    }
  }, [targetPath]);

  return (
    <>
      <Toaster />
      <MainScreen />
    </>
  );
}

export default App;
