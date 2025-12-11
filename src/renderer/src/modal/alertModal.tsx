import React from "react";

export interface AlertAction {
  name: string;
  f: () => void | Promise<void>;
}

interface AlertModalProps {
  title: string;
  message?: string;
  actions: AlertAction[];
}

const AlertModal: React.FC<AlertModalProps> = ({ title, message, actions }) => {
  return (
    <div className="modal-overlay" id="modal-overlay">
      <div className="relative h-[3px] w-full bg-white/20" />
      <div className="relative z-5 flex h-[30%] w-full flex-col items-center justify-center gap-4 border-y-4 border-y-black bg-[url('@renderer/assets/zzz_site_background.webp')] bg-cover">
        <h1 className="text-3xl font-extrabold text-white">{title}</h1>
        {message && <p className="mt-2 font-bold text-[#aaa]">{message}</p>}

        <div className="absolute bottom-0 left-1/2 flex -translate-x-1/2 translate-y-[calc(50%+4px)] gap-4 *:italic">
          {actions.map((action, index) => (
            <button key={index} onClick={action.f} className="zzzButton chess-background w-50">
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
