import { useEffect } from "react";
import { toast } from "react-hot-toast";
import CustomToast from "../components/CustomToast";

export const useModDownloadEvents = () => {
  useEffect(() => {
    window.electron.ipcRenderer.on("downloading-mod", (_, { modName }) => {
      toast.custom(() => <CustomToast message={`Downloading ${modName}...`} progress={0} />, {
        id: modName,
        duration: Infinity,
      });
    });

    window.electron.ipcRenderer.on("download-mod-progress", (_, { modName, progress }) => {
      toast.custom(() => <CustomToast message={`Downloading ${modName}...`} progress={progress} />, {
        id: modName,
        duration: Infinity,
      });
    });

    // window.electron.ipcRenderer.on("download-mod-finish", (_, { modName }) => {
    //   toast.success(`Download finished: ${modName}`, { id: modName });
    // });

    window.electron.ipcRenderer.on("unzipping-mod", (_, { modName }) => {
      toast.custom(() => <CustomToast message={`Unzipping ${modName}...`} />, {
        id: modName,
        duration: Infinity,
      });
    });

    window.electron.ipcRenderer.on("unzip-mod-finish", (_, { modName }) => {
      toast.custom(() => <CustomToast message={`Successfully installed ${modName}`} />, {
        id: modName,
        duration: 3000,
      });
    });

    window.electron.ipcRenderer.on("download-mod-error", (_, { modName, error }) => {
      toast.custom(() => <CustomToast message={`Error downloading ${modName}: ${error}`} />, {
        id: modName,
        duration: 5000,
      });
    });

    window.electron.ipcRenderer.send("renderer-ready");

    return () => {
      window.electron.ipcRenderer.removeAllListeners("downloading-mod");
      window.electron.ipcRenderer.removeAllListeners("download-mod-progress");
      window.electron.ipcRenderer.removeAllListeners("download-mod-finish");
      window.electron.ipcRenderer.removeAllListeners("unzipping-mod");
      window.electron.ipcRenderer.removeAllListeners("unzip-mod-finish");
      window.electron.ipcRenderer.removeAllListeners("download-mod-error");
    };
  }, []);
};
