import { configureStore } from "@reduxjs/toolkit";
import libraryReducer from "./slices/librarySlice";
import persistStore from "redux-persist/es/persistStore";

const store = configureStore({
  reducer: {
    library: libraryReducer,
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
