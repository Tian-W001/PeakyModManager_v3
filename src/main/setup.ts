import { app } from "electron";
import log from "electron-log/main";
import path from "path";

if (process.env.NODE_ENV === "development") {
  const devUserDataPath = path.join(app.getPath("userData"), "dev");
  app.setPath("userData", devUserDataPath);

  log.transports.file.level = false;
} else {
  log.transports.file.level = false; // test
}
