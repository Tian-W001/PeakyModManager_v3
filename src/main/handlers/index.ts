import { registerImportHandlers } from "./modImportHandlers";
import { registerLibraryHandlers } from "./modLibraryHandlers";
import { registerApplyHandlers } from "./modApplyHandlers";
import { registerIniSyncHandlers } from "./iniSyncHandlers";
import { registerModInfoHandlers } from "./modInfoHandlers";
import { registerPathsHandlers } from "./pathsHandlers";
import { registerPresetsHandlers } from "./presetsHandlers";
import { registerDialogHandlers } from "./dialogHandlers";
import { registerClearSettingsHandler } from "./clearSettingsHandler";

registerImportHandlers();
registerLibraryHandlers();
registerApplyHandlers();
registerIniSyncHandlers();
registerModInfoHandlers();
registerPathsHandlers();
registerPresetsHandlers();
registerDialogHandlers();
registerClearSettingsHandler();
