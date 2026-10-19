import { resolve } from "path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ command }) => {
  const isBuild = command === "build";
  const esbuild = isBuild ? { pure: ["console.log"] } : undefined;

  return {
    main: {
      resolve: {
        alias: {
          "@main": resolve("src/main"),
          "@shared": resolve("src/shared"),
          "@resources": resolve("resources"),
        },
      },
      plugins: [externalizeDepsPlugin()],
      esbuild,
    },
    preload: {
      plugins: [externalizeDepsPlugin()],
      esbuild,
    },
    renderer: {
      resolve: {
        alias: {
          "@renderer": resolve("src/renderer/src"),
          "@shared": resolve("src/shared"),
        },
      },
      plugins: [react(), tailwindcss()],
      esbuild,
    },
  };
});
