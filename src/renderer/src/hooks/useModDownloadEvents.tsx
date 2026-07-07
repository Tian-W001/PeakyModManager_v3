import { useEffect } from "react";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import ZzzToast from "../components/zzzToast";

export const useModDownloadEvents = () => {
  const { t } = useTranslation();

  useEffect(() => {
    const cleanups = [
      window.electron.ipcRenderer.on("downloading-mod", (_, { modName }) => {
        toast.custom(() => <ZzzToast message={t("import.downloading", { modName })} progress={0} />, {
          id: modName,
          duration: Infinity,
        });
      }),
      window.electron.ipcRenderer.on("download-mod-progress", (_, { modName, progress }) => {
        toast.custom(() => <ZzzToast message={t("import.downloading", { modName })} progress={progress} />, {
          id: modName,
          duration: Infinity,
        });
      }),
      window.electron.ipcRenderer.on("download-mod-finish", (_, { modName }) => {
        toast.dismiss(modName);
      }),
      window.electron.ipcRenderer.on("download-mod-error", (_, { modName, error }) => {
        toast.custom(() => <ZzzToast message={t("import.downloadError", { modName, error })} />, {
          id: modName,
          duration: 5000,
        });
      }),
      window.electron.ipcRenderer.on("unzipping-mod", (_, { modName }) => {
        toast.custom(() => <ZzzToast message={t("import.unzipping", { modName })} />, {
          id: modName,
          duration: Infinity,
        });
      }),
      window.electron.ipcRenderer.on("unzip-mod-finish", (_, { modName }) => {
        toast.dismiss(modName);
      }),
      window.electron.ipcRenderer.on("unzip-mod-error", (_, { modName, error }) => {
        toast.custom(() => <ZzzToast message={t("import.unzipError", { modName, error })} />, {
          id: modName,
          duration: 5000,
        });
      }),
      window.electron.ipcRenderer.on("download-cover-success", (_, { modName }) => {
        toast.custom(() => <ZzzToast message={t("import.coverDownloadSuccess", { modName })} />, {
          id: `${modName}-cover`,
          duration: 2000,
        });
      }),
      window.electron.ipcRenderer.on("download-cover-error", (_, { modName, error }) => {
        toast.custom(() => <ZzzToast message={t("import.coverDownloadError", { modName, error })} />, {
          id: `${modName}-cover`,
          duration: 5000,
        });
      }),
    ];

    window.electron.ipcRenderer.send("renderer-ready");

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [t]);
};
