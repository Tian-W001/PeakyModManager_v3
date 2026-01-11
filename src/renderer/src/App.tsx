import MainScreen from "./screens/mainScreen";
import { Toaster } from "react-hot-toast";
import { useModDownloadEvents } from "./hooks/useModDownloadEvents";
import { useEffect } from "react";

function App(): React.JSX.Element {
  /* Listeners for mod download events from main process */
  useModDownloadEvents();

  useEffect(() => {
    window.electron.ipcRenderer.invoke("on-startup");
  }, []);

  return (
    <>
      <Toaster />
      <MainScreen />
    </>
  );
}

export default App;
