import { protocol } from "electron/main";
import path from "path";
import log from "electron-log";
import mime from "mime-types";
import fs from "fs-extra";
import store from "../store";

export const modImageProtocolScheme: Electron.CustomScheme = {
  scheme: "mod-image",
  privileges: {
    standard: true,
    secure: true,
  },
};

export const registerModImageProtocol = () => {
  // renderer calls mod-image://{modName}/{imageFileName}
  protocol.handle("mod-image", async (request) => {
    try {
      const libraryPath = store.get("libraryPath", null) as string | null;
      if (!libraryPath) {
        throw new Error("Library path is not set");
      }
      const url = new URL(request.url);
      const modName = decodeURIComponent(url.hostname);
      const imageFileName = decodeURIComponent(url.pathname.slice(1)); // Remove leading '/'

      const modImagePath = path.join(libraryPath, modName, imageFileName);
      const ext = path.extname(modImagePath).toLowerCase();
      const mimeType = mime.lookup(ext);
      const buffer = await fs.readFile(modImagePath);
      return new Response(new Uint8Array(buffer), {
        status: 200,
        headers: mimeType ? { "Content-Type": mimeType } : undefined,
      });
    } catch (e) {
      log.error("Error handling mod-image protocol:", e);
      return new Response(null, { status: 404 });
    }
  });
};
