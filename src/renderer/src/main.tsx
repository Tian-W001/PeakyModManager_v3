import "./assets/global.css";
import "./i18n/config";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { Provider } from "react-redux";
import store, { persistor } from "./redux/store";
import { PersistGate } from "redux-persist/integration/react";
import { refreshLibraryAfterUpdate } from "./redux/slices/librarySlice";
import BangbooLoading from "./assets/bangboo_loading.gif";

// Share the startup promise across StrictMode mounts; cached state must rehydrate before this runs.
let startupRefresh: Promise<void> | undefined;
const startBackgroundRefresh = (): void => {
  startupRefresh ??= (async () => {
    const result = await store.dispatch(refreshLibraryAfterUpdate());
    if (refreshLibraryAfterUpdate.rejected.match(result)) {
      console.error("Automatic library refresh failed; keeping cached mods and retrying next launch:", result.error);
    }
    // Persist the refreshed cache and version together after the background scan.
    await persistor.flush();
  })().catch((error) => console.error("Could not persist the startup library refresh:", error));
  // Do not return the promise: PersistGate should open as soon as cached state is rehydrated.
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <PersistGate
        loading={
          <div className="flex h-screen items-center justify-center bg-black">
            <img src={BangbooLoading} alt="Loading" className="h-32 w-32 object-contain" />
          </div>
        }
        persistor={persistor}
        onBeforeLift={startBackgroundRefresh}
      >
        <App />
      </PersistGate>
    </Provider>
  </StrictMode>
);
