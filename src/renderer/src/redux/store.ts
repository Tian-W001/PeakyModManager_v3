import { configureStore } from "@reduxjs/toolkit";
import persistStore from "redux-persist/es/persistStore";
import libraryReducer from "./slices/librarySlice";
import uiReducer from "./slices/uiSlice";
import presetsReducer from "./slices/presetsSlice";

const store = configureStore({
  reducer: {
    library: libraryReducer,
    ui: uiReducer,
    presets: presetsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST", "persist/REHYDRATE"],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
