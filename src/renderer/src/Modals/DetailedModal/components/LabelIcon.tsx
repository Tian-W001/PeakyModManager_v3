import { useId } from "react";
import clsx from "clsx";

type LabelIconProps = {
  src: string;
  onClick?: () => void;
  className?: string;
};

const LabelIcon = ({ src, onClick, className }: LabelIconProps) => {
  const filterId = useId();

  return (
    <div className={clsx("size-8", className)} onClick={onClick}>
      <svg className="pointer-events-none absolute top-0 left-0 h-8 w-13" viewBox="0 0 52 32">
        <defs>
          <filter id={filterId} x="-20%" y="-100%" width="140%" height="300%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" />
            <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8" />
          </filter>
        </defs>
        <g filter={`url(#${filterId})`} fill="black">
          <circle cx="16" cy="16" r="16" />
          <rect
            width="48"
            height="32"
            rx="16"
            className="translate-x-(--field-inset) transition-[translate] duration-(--field-duration) ease-(--field-easing) motion-reduce:transition-none"
          />
        </g>
      </svg>
      <div className="hover:border-zzzYellow relative size-full cursor-pointer overflow-hidden rounded-full border-3 bg-black">
        <img src={src} alt="" draggable={false} className="size-full object-contain" />
      </div>
    </div>
  );
};

export default LabelIcon;
