import { useEffect } from "react";
import MainScreen from "./screens/mainScreen";
//import { useLocalStorage } from "@uidotdev/usehooks";
import { readLibrary } from "./redux/slices/librarySlice";
import { useAppDispatch } from "./redux/hooks";

function App(): React.JSX.Element {
  const dispatch = useAppDispatch();
  //const [libraryPath] = useLocalStorage("libraryPath", "");

  useEffect(() => {
    dispatch(readLibrary());
  }, [dispatch]);

  return (
    <>
      <MainScreen />
    </>
  );
}

export default App;
