import clsx from "clsx";
//const icons = import.meta.glob("@renderer/assets/icons/*", { eager: true, query: "?url", import: "default" });

const getIconUrl = (name: string) => {
  return new URL(`../assets/icons/${name}.png`, import.meta.url).href;
};

type ZzzButtonType =
  | "Ok"
  | "Cancel"
  | "Apply"
  | "Download"
  | "Add"
  | "Refresh"
  | "Save"
  | "Info"
  | "Setting"
  | "Refresh"
  | "Track"
  | "FairyAI"
  | "FairyWarning";
type ZzzButtonProps = {
  type?: ZzzButtonType;
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
};

const ZzzButton = ({ type, onClick, className, children }: ZzzButtonProps) => {
  return (
    <>
      <button
        className={clsx(
          "group hover:bg-zzzYellow relative flex h-11 items-center overflow-hidden rounded-full bg-[#111] font-bold ring-2 ring-black transition-all not-hover:bg-size-[4px_4px] not-hover:text-white hover:animate-[box-shadow-pulse_0.8s_cubic-bezier(0.25,0.1,0.75,1)_infinite] hover:text-black",
          children ? "w-50" : "aspect-square",
          className
        )}
        onClick={onClick}
      >
        <div className="chess-background absolute top-0 left-0 size-full overflow-hidden rounded-full bg-transparent inset-shadow-[1px_2px_1px_#fff3,0_0_0_4px_#333] group-hover:inset-shadow-[0_0_0_0_#0000]" />
        {type && (
          <div
            className={`aspect-square h-full rounded-full p-3 inset-ring-4 inset-ring-[#333] group-hover:inset-ring-0`}
          >
            <img
              src={getIconUrl(type)}
              alt={type}
              className="h-full object-contain group-hover:filter-[url(#color-inverted-binary)]"
            />
          </div>
        )}
        {children && <div className={`${type ? "mr-4" : "mx-4"} flex-1 overflow-hidden`}>{children}</div>}
      </button>
    </>
  );
};

export default ZzzButton;
