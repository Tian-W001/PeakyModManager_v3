import { protocol } from "electron/main";
import path from "path";
import log from "electron-log";
import mime from "mime-types";
import fs from "fs-extra";

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
      const url = new URL(request.url);
      const modImagePath = decodeURIComponent(url.pathname).replace(/^\//, "");
      const ext = path.extname(modImagePath).toLowerCase();
      const mimeType = mime.lookup(ext);
      const buffer = await fs.readFile(modImagePath);
      return new Response(new Uint8Array(buffer), {
        status: 200,
        headers: mimeType ? { "Content-Type": mimeType } : undefined,
      });
    } catch (e) {
      log.error("Error handling mod-image protocol:", e);
      return new Response(`${request} not found`, { status: 404 });
    }
  });
};
