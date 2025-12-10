import { app } from "electron";
import path from "path";

if (process.env.NODE_ENV === "development") {
  const devUserDataPath = path.join(app.getPath("userData"), "dev");
  app.setPath("userData", devUserDataPath);
  console.log("Development mode: userData path set to", devUserDataPath);
}
