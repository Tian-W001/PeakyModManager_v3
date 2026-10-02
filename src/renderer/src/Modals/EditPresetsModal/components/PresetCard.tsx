import clsx from "clsx";
import IconHook from "@renderer/assets/icons/Hook.png";
import ZzzButton from "@renderer/components/zzzButton";

const PresetCard = ({
  name,
  isCurrent,
  onRemove,
  className,
}: {
  name: string;
  isCurrent: boolean;
  onRemove: () => void;
  className?: string;
}) => (
  <div
    className={clsx(
      "group relative flex items-center justify-center rounded-3xl bg-[#333] p-2 ring inset-shadow-[1px_1px_0px_#fff2,0_0_0_3px_#666]",
      className
    )}
  >
    {isCurrent && <img src={IconHook} alt="Current" className="absolute -top-1 -right-1 size-6" />}
    <span className="truncate font-bold text-white">{name}</span>
    {name !== "Default Preset" && (
      <div className="absolute flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
        <ZzzButton type="Cancel" onClick={onRemove} />
      </div>
    )}
  </div>
);

export default PresetCard;
