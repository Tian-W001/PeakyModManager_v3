import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@renderer/redux/hooks";
import { addPreset, removePreset, renamePreset, selectAllPresetNames } from "@renderer/redux/slices/presetsSlice";
import { FaTrash, FaEdit, FaCheck, FaTimes } from "react-icons/fa";

const EditPresetsModal = ({ onClose }: { onClose: () => void }) => {
  const dispatch = useAppDispatch();
  const allPresetNames = useAppSelector(selectAllPresetNames);
  const [newPresetName, setNewPresetName] = useState("");
  const [editingPresetName, setEditingPresetName] = useState<string | null>(null);
  const [tempPresetName, setTempPresetName] = useState("");

  const handleAddPreset = () => {
    if (newPresetName.trim()) {
      dispatch(addPreset(newPresetName.trim()));
      setNewPresetName("");
    }
  };

  const handleRemovePreset = (name: string) => {
    if (confirm(`Are you sure you want to delete preset "${name}"?`)) {
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
          <h2 className="text-xl font-bold">Manage Presets</h2>
          <button onClick={onClose} className="font-bold text-red-600 hover:text-red-800">
            <FaTimes size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-4 flex gap-2">
            <input
              type="text"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              placeholder="New Preset Name"
              className="flex-1 rounded border border-gray-400 px-2 py-1"
            />
            <button
              onClick={handleAddPreset}
              className="rounded bg-blue-600 px-4 py-1 font-bold text-white hover:bg-blue-700"
            >
              Add
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
                    <button onClick={saveEditing} className="text-green-600 hover:text-green-800">
                      <FaCheck />
                    </button>
                    <button onClick={cancelEditing} className="text-red-600 hover:text-red-800">
                      <FaTimes />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="font-bold">{name}</span>
                    {name !== "Default Preset" && (
                      <div className="flex gap-2">
                        <button onClick={() => startEditing(name)} className="text-blue-600 hover:text-blue-800">
                          <FaEdit />
                        </button>
                        <button onClick={() => handleRemovePreset(name)} className="text-red-600 hover:text-red-800">
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
