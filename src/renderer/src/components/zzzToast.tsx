import React from "react";
import BangbooLoading from "@renderer/assets/bangboo_loading.gif";

interface ZzzToastProps {
  message: string;
  progress?: number;
}

const ZzzToast: React.FC<ZzzToastProps> = ({ message, progress }) => {
  return (
    <div className="chess-background flex h-auto max-w-[75vw] min-w-[400px] flex-col items-center justify-center rounded-3xl bg-[#333] p-4 font-bold text-white ring-2 inset-shadow-[1px_2px_1px_#fff4,-1px_-2px_1px_#0004,0_0_0_4px_#888] ring-black">
      <div className="w-full truncate text-center" title={message}>
        {message}
      </div>
      {progress !== undefined && (
        <div className="relative mt-6 h-2 w-[80%]">
          <div className="size-full overflow-hidden rounded-full bg-black shadow-[1px_1px_1px_#fff3]">
            <div
              className="bg-zzzYellow h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
            <img
              src={BangbooLoading}
              alt="Loading..."
              className="absolute bottom-0 h-8 -translate-x-1/2 translate-y-[13%] object-contain transition-all duration-300 ease-out"
              style={{ left: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ZzzToast;
