import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@renderer/redux/hooks";
import { addPreset, removePreset, renamePreset, selectAllPresetNames } from "@renderer/redux/slices/presetsSlice";
import { FaTrash, FaEdit, FaCheck, FaTimes } from "react-icons/fa";
import { useTranslation } from "react-i18next";

const EditPresetsModal = ({ onClose }: { onClose: () => void }) => {
  const dispatch = useAppDispatch();
  const allPresetNames = useAppSelector(selectAllPresetNames);
  const [newPresetName, setNewPresetName] = useState("");
  const [editingPresetName, setEditingPresetName] = useState<string | null>(null);
  const [tempPresetName, setTempPresetName] = useState("");
  const { t } = useTranslation();

  const handleAddPreset = () => {
    if (newPresetName.trim()) {
      dispatch(addPreset(newPresetName.trim()));
      setNewPresetName("");
    }
  };

  const handleRemovePreset = (name: string) => {
    if (confirm(t("presets.deleteConfirm", { name }))) {
      dispatch(removePreset(name));
    }
  };

  const startEditing = (name: string) => {
    setEditingPresetName(name);
    setTempPresetName(name);
  };

  const cancelEditing = () => {
    setEditingPresetName(null);
    setTempPresetName("");
  };

  const saveEditing = () => {
    if (editingPresetName && tempPresetName.trim() && tempPresetName !== editingPresetName) {
      dispatch(renamePreset({ oldName: editingPresetName, newName: tempPresetName.trim() }));
    }
    setEditingPresetName(null);
    setTempPresetName("");
  };

  return (
    <div className="fixed inset-0 z-50 flex size-full items-center justify-center bg-black/50" id="modal-overlay">
      <div className="flex h-[60%] w-[40%] flex-col overflow-hidden rounded-2xl border-2 border-black bg-white">
        <div className="flex items-center justify-between bg-gray-300 p-4">
          <h2 className="text-xl font-bold">{t("presets.managePresets")}</h2>
          <button onClick={onClose} className="chess-background">
            <FaTimes size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-4 flex gap-2">
            <input
              type="text"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              placeholder={t("presets.newPresetName")}
              className="flex-1 rounded border border-gray-400 px-2 py-1"
            />
            <button onClick={handleAddPreset} className="chess-background">
              {t("common.add")}
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {allPresetNames.map((name) => (
              <div
                key={name}
                className="flex items-center justify-between rounded border border-gray-300 bg-gray-100 p-2"
              >
                {editingPresetName === name ? (
                  <div className="flex flex-1 items-center gap-2">
                    <input
                      type="text"
                      value={tempPresetName}
                      onChange={(e) => setTempPresetName(e.target.value)}
                      className="flex-1 rounded border border-gray-400 px-2 py-1"
                      autoFocus
                    />
                    <button onClick={saveEditing} className="chess-background">
                      <FaCheck />
                    </button>
                    <button onClick={cancelEditing} className="chess-background">
                      <FaTimes />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="font-bold">{name}</span>
                    {name !== "Default Preset" && (
                      <div className="flex gap-2">
                        <button onClick={() => startEditing(name)} className="chess-background">
                          <FaEdit />
                        </button>
                        <button onClick={() => handleRemovePreset(name)} className="chess-background">
                          <FaTrash />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditPresetsModal;
