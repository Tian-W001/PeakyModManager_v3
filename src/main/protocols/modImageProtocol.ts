import { protocol } from "electron/main";
import path from "path";
import log from "electron-log";
import mime from "mime-types";
import fs from "fs-extra";
import { getLibraryPath } from "../services/storeService";
import { resolveInside } from "../utils";

export const modImageProtocolScheme: Electron.CustomScheme = {
  scheme: "mod-image",
  privileges: {
    standard: true,
    secure: true,
  },
};

export const registerModImageProtocol = () => {
  protocol.handle("mod-image", async (request) => {
    try {
      const libraryPath = getLibraryPath();
      if (!libraryPath || !(await fs.pathExists(libraryPath))) {
        return new Response(null, { status: 404 });
      }
      const url = new URL(request.url);
      const pathname = decodeURIComponent(url.pathname).replace(/^[/\\]+/, "");
      const modImagePath = resolveInside(libraryPath, pathname);
      if (!modImagePath) {
        return new Response(null, { status: 404 });
      }

      // Check if path is a directory or doesn't exist
      try {
        const stats = await fs.stat(modImagePath);
        if (stats.isDirectory()) {
          return new Response(null, { status: 404 });
        }
      } catch {
        // File doesn't exist
        return new Response(null, { status: 404 });
      }

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
