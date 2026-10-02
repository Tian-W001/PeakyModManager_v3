import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "@renderer/redux/hooks";
import { selectCurrentWallpaper, setCurrentWallpaper } from "@renderer/redux/slices/uiSlice";
import IconInfo from "@renderer/assets/icons/Info.png";
import IconHookBig from "@renderer/assets/icons/HookBig.png";

const wallpaperModules = import.meta.glob("@renderer/assets/wallpapers/*", {
  eager: false,
  query: "?url",
  import: "default",
});

const WallpaperPicker = () => {
  const dispatch = useAppDispatch();
  const currentWallpaper = useAppSelector(selectCurrentWallpaper);
  const { t } = useTranslation();
  const [wallpapers, setWallpapers] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries = Object.entries(wallpaperModules);
      const urls = await Promise.all(entries.map(([, loader]) => loader() as Promise<string>));
      if (cancelled) return;
      const result: Record<string, string> = {};
      entries.forEach(([path], i) => {
        result[path] = urls[i];
      });
      setWallpapers(result);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSaveWallpaper = (selectedWallpaper: string) => {
    dispatch(setCurrentWallpaper(selectedWallpaper));
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      const handleWheel = (e: WheelEvent) => {
        if (e.deltaY !== 0) {
          e.preventDefault();
          container.scrollLeft += e.deltaY;
        }
      };
      container.addEventListener("wheel", handleWheel, { passive: false });
      return () => {
        container.removeEventListener("wheel", handleWheel);
      };
    }
    return;
  }, []);

  return (
    <div className="flex flex-col gap-1">
      <div
        ref={scrollContainerRef}
        className="no-scrollbar flex flex-row items-center gap-2 overflow-x-scroll rounded-3xl border-8 bg-black shadow-[1px_1px_1px_#fff2]"
      >
        {!wallpapers
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="aspect-video w-48 shrink-0 animate-pulse rounded-2xl bg-white/5" />
            ))
          : Object.entries(wallpapers).map(([path, url]) => {
              const filename = path.split("/").pop() || "";
              const isCurrent = currentWallpaper === filename;
              return (
                <div
                  key={path}
                  className={`hover:border-zzzYellow relative aspect-video w-48 shrink-0 cursor-pointer overflow-hidden rounded-2xl border-3 transition-colors`}
                  onDoubleClick={() => handleSaveWallpaper(filename)}
                >
                  <img src={url} alt={filename} className="size-full object-cover" />
                  {isCurrent && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <img src={IconHookBig} className="h-12 w-12" />
                    </div>
                  )}
                </div>
              );
            })}
      </div>
      <p className="flex items-center gap-1 pl-3 text-sm text-[#999]">
        <img src={IconInfo} alt="Info" className="mr-1 inline-block h-4 w-4" />
        {t("settings.wallpaperTooltip")}
      </p>
    </div>
  );
};

export default WallpaperPicker;
