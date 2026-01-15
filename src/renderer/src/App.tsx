import MainScreen from "./screens/mainScreen";
import { Toaster } from "react-hot-toast";
import { useModDownloadEvents } from "./hooks/useModDownloadEvents";

function App(): React.JSX.Element {
  /* Listeners for mod download events from main process */
  useModDownloadEvents();

  return (
    <>
      <Toaster />
      <MainScreen />
    </>
  );
}

export default App;
