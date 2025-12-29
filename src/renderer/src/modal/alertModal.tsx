import React from "react";
import clsx from "clsx";

interface AlertModalProps {
  title: string;
  message?: string;
  children?: React.ReactNode;
  className?: string;
}

const AlertModal: React.FC<AlertModalProps> = ({ title, message, children, className }) => {
  return (
    <div className={clsx("modal-overlay", className)} id="modal-overlay">
      <div className="relative h-0.75 w-full bg-white/20" />
      <div className="relative z-5 flex h-[30%] w-full flex-col items-center justify-center gap-4 border-y-4 border-y-black bg-[url('@renderer/assets/wallpapers/zzz_wallpaper_0.jpg')] bg-cover">
        <h1 className="w-full text-center text-3xl text-white">{title}</h1>
        {message && <p className="mt-2 w-full text-center text-[#aaa]">{message}</p>}

        <div className="absolute bottom-0 left-1/2 flex -translate-x-1/2 translate-y-[calc(50%+4px)] gap-4 *:italic">
          {children}
        </div>
      </div>
      <div className="relative h-0.75 w-full bg-white/20" />
    </div>
  );
};

export default AlertModal;
