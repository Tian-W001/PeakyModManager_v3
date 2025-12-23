# PeakyModManager v3

A lightweight mod manager for **Zenless Zone Zero**.

## Features

- **Mod Management**
  Import, enable, and disable mods with ease.
- **Presets**
  Save multiple mod configurations and switch between them quickly.
- **Visual Interface**
  Clean, **Zenless Zone Zero–style** UI design.
- **Backup & Restore**
  Safely back up and restore preset configurations.

## Getting Started

### Initial Setup

Before using PeakyModManager, you need to configure the required paths:

1. Click the **Settings** button in the bottom bar.
2. **Library Path**
   Select the folder where your mods will be stored. This acts as the main _source_ directory.
3. **Target Path**
   Select the game's mod folder where mods will be installed.
   - For **ZZMI users**, this should be `ZZMI/ZZMI/Mods`.

---

### Importing Mods

- **Drag & Drop**
  Drag a mod folder directly into the application window to import it into your Library.
  Newly imported mods will appear in the **Unknown** category by default.
- **Manual Import Notice**
  If you add mod folders directly through the file system instead of the app:
  - Click **Refresh** to detect them.
  - They will also be placed in the **Unknown** category by default.

---

### Enabling & Disabling Mods

1. Click a mod card to toggle its state:
   - **Yellow solid border** → Mod is **enabled**
   - **Black solid border** → Mod is **disabled**
   - **Yellow dashed border** → Mod is queued to be **enabled**
   - **Red dashed border** → Mod is queued to be **disabled**
2. The **Apply** button in the bottom bar shows the number of pending changes.
3. Click **Apply** to commit changes.
   This will create or remove **symbolic links** in the Target Path.

---

### Editing Mods

1. **Right-click** a mod card to open the edit modal.
2. You can edit:
   - Description
   - Mod Type
   - Character (for Character-type mods)
   - Source URL
3. **Delete**
   Deletes the **actual mod files** from disk.
4. **Autofill** will:
   - Automatically set the preview image:
     - Prefers images named `Preview`
     - Falls back to any available image, if present.
   - Automatically set the description:
     - Reads from a file named `readme`, if present
   - Attempt to match the mod title with a character name:
     - Sets the mod type to **Character**
     - Assigns the matched character
5. Click **Save** to apply changes.

---

## Using Presets

1. Presets allow you to store and switch between different mod combinations.
2. Switch the active preset using the button in the **bottom-right corner**.
3. ⚠️ **Important**
   Loading a preset only queues changes as **Pending**.
   You must click **Apply** in the bottom bar to actually apply them.
4. Preset management:
   - Click the **+** button to manage presets.
   - Hover over a preset block to reveal the **Delete** button.

---

## Backup & Restore

Located in **Settings**:

- **Backup**
  - Saves preset configurations to: `Presets_Backup.json` inside your Library folder.
  - ⚠️ This will **overwrite** any existing backup file.

- **Restore**
  - Loads data from `Presets_Backup.json`.
  - ⚠️ This will **overwrite** your current preset configurations.
  - After restoring, you must **re-apply the current preset** from the pending queue to reflect changes.

## Auto Updates

- When you launch the app, wait a few seconds until a system notification pops up, indicating that a new version has been downloaded and will be installed after you quit the app.

## Previews

![screenshot_main](images/README/screenshot_main.png)
![screenshot_main](images/README/screenshot_apply.png)
![screenshot_main](images/README/screenshot_detailmodal.png)
![screenshot_main](images/README/screenshot_presetsmodal.png)
![screenshot_main](images/README/screenshot_settings.png)
