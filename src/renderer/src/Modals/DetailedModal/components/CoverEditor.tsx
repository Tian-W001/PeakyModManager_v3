import clsx from "clsx";
import type { DragEvent } from "react";
import { useTranslation } from "react-i18next";
import defaultCover from "@renderer/assets/default_cover.jpg";
import ZzzButton from "@renderer/components/zzzButton";

const CoverEditor = ({
  modName,
  coverImage,
  onCoverChange,
  className,
}: {
  className?: string;
  modName: string;
  coverImage: string;
  onCoverChange: (coverImage: string) => void;
}) => {
  const { t } = useTranslation();
  const saveCover = async (imageSource: string) => {
    const newCoverName = await window.electron.ipcRenderer.invoke("import-mod-cover", modName, imageSource);
    if (newCoverName) {
      onCoverChange(newCoverName);
    }
  };

  const handleViewCover = async () => {
    await window.electron.ipcRenderer.invoke("view-cover", modName, coverImage);
  };

  const handleSetCover = async () => {
    const imagePath = await window.electron.ipcRenderer.invoke("select-cover", modName);
    if (imagePath) {
      await saveCover(imagePath);
    }
  };

  const handleRemoveCover = async () => {
    onCoverChange("");
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const url = (e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain")).trim();
    const file = e.dataTransfer.files[0];
    const filePath = file ? window.api.getFilePath(file) : null;

    if (/^https?:\/\//i.test(url)) {
      await saveCover(url);
    } else if (file?.type.startsWith("image/") && filePath) {
      await saveCover(filePath);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      className={clsx("relative overflow-hidden p-3", className)}
      id="left-section"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <div
        id="cover-image-container"
        className="group hover:border-zzzYellow relative size-full overflow-hidden rounded-2xl border-3 border-black bg-black shadow-[1px_1px_1px_#fff2] hover:border-2"
      >
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-[filter] duration-300 group-hover:blur-sm"
          style={{
            backgroundImage: coverImage
              ? `url("mod-image://local/${modName}/${coverImage}")`
              : `url("${defaultCover}")`,
          }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          {coverImage ? (
            <>
              <ZzzButton onClick={handleRemoveCover} className="w-40">
                {t("modDetails.removeCover")}
              </ZzzButton>
              <ZzzButton onClick={handleViewCover} className="w-40">
                {t("modDetails.viewCover")}
              </ZzzButton>
              <ZzzButton onClick={handleSetCover} className="w-40">
                {t("modDetails.changeCover")}
              </ZzzButton>
            </>
          ) : (
            <ZzzButton onClick={handleSetCover} className="w-40">
              {t("modDetails.setCover")}
            </ZzzButton>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoverEditor;
