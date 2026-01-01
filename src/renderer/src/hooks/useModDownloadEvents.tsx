import { useEffect } from "react";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import ZzzToast from "../components/zzzToast";

export const useModDownloadEvents = () => {
  const { t } = useTranslation();

  useEffect(() => {
    window.electron.ipcRenderer.on("downloading-mod", (_, { modName }) => {
      toast.custom(() => <ZzzToast message={t("import.downloading", { modName })} progress={0} />, {
        id: modName,
        duration: 2000,
      });
    });

    window.electron.ipcRenderer.on("download-mod-progress", (_, { modName, progress }) => {
      toast.custom(() => <ZzzToast message={t("import.downloading", { modName })} progress={progress} />, {
        id: modName,
        duration: 10000,
      });
    });

    // window.electron.ipcRenderer.on("download-mod-finish", (_, { modName }) => {
    //   toast.success(`Download finished: ${modName}`, { id: modName });
    // });

    window.electron.ipcRenderer.on("download-mod-error", (_, { modName, error }) => {
      toast.custom(() => <ZzzToast message={t("download.error", { modName, error })} />, {
        id: modName,
        duration: 5000,
      });
    });

    window.electron.ipcRenderer.on("unzipping-mod", (_, { modName }) => {
      toast.custom(() => <ZzzToast message={t("import.unzipping", { modName })} progress={0} />, {
        id: modName,
        duration: 2000,
      });
    });

    window.electron.ipcRenderer.on("unzip-mod-progress", (_, { modName, progress }) => {
      toast.custom(() => <ZzzToast message={t("import.unzipping", { modName })} progress={progress} />, {
        id: modName,
        duration: 10000,
      });
    });

    window.electron.ipcRenderer.on("unzip-mod-finish", (_, { modName }) => {
      toast.custom(() => <ZzzToast message={t("download.success", { modName })} />, {
        id: modName,
        duration: 2000,
      });
    });

    window.electron.ipcRenderer.on("unzip-mod-error", (_, { modName, error }) => {
      toast.custom(() => <ZzzToast message={t("import.unzipError", { modName, error })} />, {
        id: modName,
        duration: 5000,
      });
    });

    window.electron.ipcRenderer.on("download-cover-success", (_, { modName }) => {
      toast.custom(() => <ZzzToast message={t("import.coverDownloadSuccess", { modName })} />, {
        id: `${modName}-cover`,
        duration: 2000,
      });
    });

    window.electron.ipcRenderer.on("download-cover-error", (_, { modName, error }) => {
      toast.custom(() => <ZzzToast message={t("import.coverDownloadError", { modName, error })} />, {
        id: `${modName}-cover`,
        duration: 5000,
      });
    });

    window.electron.ipcRenderer.send("renderer-ready");

    return () => {
      window.electron.ipcRenderer.removeAllListeners("downloading-mod");
      window.electron.ipcRenderer.removeAllListeners("download-mod-progress");
      window.electron.ipcRenderer.removeAllListeners("download-mod-finish");
      window.electron.ipcRenderer.removeAllListeners("download-mod-error");
      window.electron.ipcRenderer.removeAllListeners("unzipping-mod");
      window.electron.ipcRenderer.removeAllListeners("unzip-mod-progress");
      window.electron.ipcRenderer.removeAllListeners("unzip-mod-finish");
      window.electron.ipcRenderer.removeAllListeners("unzip-mod-error");
      window.electron.ipcRenderer.removeAllListeners("download-cover-success");
      window.electron.ipcRenderer.removeAllListeners("download-cover-error");
    };
  }, [t]);
};
