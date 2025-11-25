import React from "react";

export interface AlertAction {
  name: string;
  f: () => void;
}

interface AlertModalProps {
  title: string;
  message?: string;
  actions: AlertAction[];
}

const AlertModal: React.FC<AlertModalProps> = ({ title, message, actions }) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center border-2 bg-black/80">
      <div className="relative h-[3px] w-full bg-white/20" />
      <div className="relative z-5 flex h-[30%] w-full flex-col items-center justify-center gap-4 border-y-4 border-y-black bg-[url('@renderer/assets/zzz_site_background.webp')] bg-cover">
        {/* Message */}
        <h1 className="text-3xl font-extrabold text-white">{title}</h1>
        {message && <p className="mt-2 font-bold text-[#aaa]">{message}</p>}

        {/* Buttons */}
        <div className="absolute bottom-0 left-1/2 flex -translate-x-1/2 translate-y-[calc(50%+4px)] gap-4">
          {actions.map((action, index) => (
            <button key={index} onClick={action.f} className="w-50">
              {action.name}
            </button>
          ))}
        </div>
      </div>
      <div className="relative h-[3px] w-full bg-white/20" />
    </div>
  );
};

export default AlertModal;
