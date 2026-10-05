import ModalOverlay from "@renderer/Modals/components/ModalOverlay";
import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@renderer/redux/hooks";
import {
  addPreset,
  removePreset,
  selectAllPresetNames,
  selectCurrentPresetName,
} from "@renderer/redux/slices/presetsSlice";
import { useTranslation } from "react-i18next";
import ModalHeader from "@renderer/Modals/components/ModalHeader";
import PresetCard from "./components/PresetCard";
import IconInfo from "@renderer/assets/icons/Info.png";
import { useAlertModal } from "@renderer/hooks/useAlertModal";
import ZzzButton from "@renderer/components/zzzButton";

const EditPresetsModalContent = ({ onClose }: { onClose: () => void }) => {
  const dispatch = useAppDispatch();
  const allPresetNames = useAppSelector(selectAllPresetNames);
  const currentPresetName = useAppSelector(selectCurrentPresetName);
  const [newPresetName, setNewPresetName] = useState("");
  const { t } = useTranslation();
  const { showAlert, hideAlert, alert } = useAlertModal();

  const handleAddPreset = () => {
    if (newPresetName.trim()) {
      dispatch(addPreset(newPresetName.trim()));
      setNewPresetName("");
    }
  };

  const handleRemovePreset = (name: string) => {
    showAlert(
      t("presets.deleteConfirm", { name }),
      undefined,
      <>
        <ZzzButton type="Cancel" onClick={hideAlert}>
          {t("common.cancel")}
        </ZzzButton>
        <ZzzButton
          type="Ok"
          onClick={() => {
            dispatch(removePreset(name));
            hideAlert();
          }}
        >
          {t("common.confirm")}
        </ZzzButton>
      </>
    );
  };

  return (
    <>
      <div
        className={
          "chess-background flex size-[60%] flex-col overflow-hidden rounded-2xl rounded-tr-lg border-4 border-black bg-[#333] inset-shadow-[1px_-1px_2px_#fff3,-1px_-1px_2px_#0009]"
        }
      >
        <ModalHeader onClose={onClose}>
          <p className="text-2xl font-bold text-white italic">{t("presets.managePresets")}</p>
        </ModalHeader>

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
              <PresetCard
                className="h-16 w-full"
                key={name}
                name={name}
                isCurrent={name === currentPresetName}
                onRemove={() => handleRemovePreset(name)}
              />
            ))}
          </div>
        </div>
      </div>
      {alert}
    </>
  );
};

const EditPresetsModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
  <ModalOverlay isOpen={isOpen}>
    <EditPresetsModalContent onClose={onClose} />
  </ModalOverlay>
);

export default EditPresetsModal;
