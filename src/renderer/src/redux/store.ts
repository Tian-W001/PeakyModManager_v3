import { configureStore } from "@reduxjs/toolkit";
import libraryReducer from "./slices/librarySlice";

const store = configureStore({
  reducer: {
    library: libraryReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
