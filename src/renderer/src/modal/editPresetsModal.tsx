import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@renderer/redux/hooks";
import {
  addPreset,
  removePreset,
  selectAllPresetNames,
  selectCurrentPresetName,
} from "@renderer/redux/slices/presetsSlice";
import { useTranslation } from "react-i18next";
import Exit from "@renderer/components/Exit";
import IconHook from "@renderer/assets/icons/Hook.png";
import IconInfo from "@renderer/assets/icons/Info.png";
import { useAlertModal } from "@renderer/hooks/useAlertModal";
import ZzzButton from "@renderer/components/zzzButton";

const EditPresetsModal = ({ onClose }: { onClose: () => void }) => {
  const dispatch = useAppDispatch();
  const allPresetNames = useAppSelector(selectAllPresetNames);
  const currentPresetName = useAppSelector(selectCurrentPresetName);
  const [newPresetName, setNewPresetName] = useState("");
  const { t } = useTranslation();
  const { showAlert, hideAlert, RenderAlert } = useAlertModal();

  const handleAddPreset = () => {
    if (newPresetName.trim()) {
      dispatch(addPreset(newPresetName.trim()));
      setNewPresetName("");
    }
  };

  const handleRemovePreset = (name: string) => {
    showAlert(t("presets.deleteConfirm", { name }), undefined, [
      { name: t("common.cancel"), f: hideAlert },
      {
        name: t("common.confirm"),
        f: () => {
          dispatch(removePreset(name));
          hideAlert();
        },
      },
    ]);
  };

  return (
    <div className="modal-overlay" id="modal-overlay">
      <div className="chess-background flex size-[60%] flex-col overflow-hidden rounded-2xl border-4 border-black bg-[#333] inset-shadow-[1px_-1px_2px_#fff3,-1px_-1px_2px_#0009]">
        <div className="flex items-center justify-between bg-black/20 px-4 py-2" id="modal-header">
          <div className="title-decorator flex min-w-0 items-center gap-2" id="title-wrapper">
            <p className="text-2xl font-bold text-white italic">{t("presets.managePresets")}</p>
          </div>
          <Exit
            className="hover:fill-zzzYellow shrink-0 fill-[#c42209] transition-all hover:scale-110"
            onClick={onClose}
          />
        </div>

        <div className="no-scrollbar flex flex-1 flex-col gap-4 overflow-y-auto p-4" id="info-container">
          <div className="flex flex-col items-start justify-between gap-1 px-3 py-1 font-bold text-white">
            <input
              className="hover:text-zzzYellow w-full flex-1 rounded-full bg-black px-3 py-1 font-bold text-white shadow-[1px_1px_1px_#fff2]"
              value={newPresetName}
              placeholder={t("presets.newPresetName")}
              onChange={(e) => setNewPresetName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddPreset();
                }
              }}
            />
            <p className="flex items-center gap-1 pl-3 text-sm text-[#999]">
              <img src={IconInfo} alt="Info" className="mr-1 inline-block h-4 w-4" />
              {t("presets.pressEnterToAdd")}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 rounded-4xl bg-black/10 p-4" id="presets-list">
            {allPresetNames.map((name) => (
              <div
                key={name}
                className="group relative flex h-16 w-full items-center justify-center rounded-3xl bg-[#333] p-2 ring inset-shadow-[1px_1px_0px_#fff2,0_0_0_3px_#666]"
              >
                {name === currentPresetName && (
                  <img src={IconHook} alt="Current" className="absolute -top-1 -right-1 size-6" />
                )}
                <span className="truncate font-bold text-white" title={name}>
                  {name}
                </span>
                {name !== "Default Preset" && (
                  <div className="absolute flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <ZzzButton type="Cancel" onClick={() => handleRemovePreset(name)} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <RenderAlert />
    </div>
  );
};

export default EditPresetsModal;
