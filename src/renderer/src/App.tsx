import { useEffect } from "react";
import MainScreen from "./screens/mainScreen";
import { useAppDispatch } from "./redux/hooks";
import { Toaster, toast } from "react-hot-toast";

function App(): React.JSX.Element {
  const dispatch = useAppDispatch();

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

  return (
    <>
      <Toaster />
      <MainScreen />
    </>
  );
}

export default App;
