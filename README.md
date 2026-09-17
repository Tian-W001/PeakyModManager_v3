# PeakyModManager v3

[English](README.md) | [简体中文](README.zh-CN.md)

A lightweight mod manager for Zenless Zone Zero.

## Features

- **Mod Management**
  Import, enable, and disable mods with ease.
- **Presets**
  Save multiple mod configurations and switch between them quickly.
- **Visual Interface**
  Clean, **Zenless Zone Zero–style** UI design.
- **Backup & Restore**
  Safely back up and restore preset configurations.
- **Toggle Editing**
  Inspect and edit persistent toggle states and key bindings directly in supported Mod INI files.
- **Windows and Linux Support**
  Built with Electron for Windows and Linux, though correct operation on Linux is not guaranteed.

## Getting Started

### Initial Setup

Before using PeakyModManager, you need to configure the required paths:

1. Click the **Settings** button in the bottom bar.
2. **Library Path**
   Select the folder where your mods will be stored. This acts as the main _source_ directory.
3. **Target Path**
   Select the game's mod folder where mods will be installed.
   - For **ZZMI users**, this should be `ZZMI/ZZMI/Mods`.
4. **d3dx_user.ini Path** (optional)
   Select ZZMI's `d3dx_user.ini` if you want to use **Sync Toggles**. This is not required for editing a Mod's
   own Toggle states or key bindings.

If you are unsure how to set up the paths, you can organize your existing mod folder as follows:

1. Rename the folder currently containing your mods to `ModResources`, and make sure it contains only sub folders and no files.
2. Create a new, empty `Mods` folder alongside it.
3. Set **Library Path** to `ModResources`.
4. Set **Target Path** to the new `Mods` folder.

---

### Importing Mods

- **Drag & Drop**

  Drag a mod folder directly into the application window to import it into your Library.
  Newly imported mods will appear in the **Unknown** category by default.

- **Use [PMM-Mod-Importer](https://github.com/Tian-W001/PMM_Mod_Importer)**

  Use this Chrome extension to import mods from GameBanana. It will open the app and start downloading the mod.

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
   - Outfit (for Character-type mods)
   - Source URL
   - Cover image (supports dragging and dropping images or image URLs)
3. Hover over the Character or Outfit row to reveal its avatar or icon on the left. Click it to jump to the corresponding character or outfit view.
4. **Delete**
   Deletes the **actual mod files** from disk.
5. **Autofill** will:
   - Automatically set the preview image:
     - Prefers images named `Preview`
     - Falls back to any available image, if present.
   - Automatically set the description:
     - Reads from a file named `readme`, if present
   - Attempt to match the mod title with a character name:
     - Sets the mod type to **Character**
     - Assigns the matched character
6. Click **Save** to apply changes.

---

### Editing 3DMigoto Toggles

When a Mod contains `global persist` constants, its edit modal includes a **Toggles** row:

- The left column shows the persistent constant, such as `$hair`.
- Click the current key binding, then press a key combination to replace it. Press `Esc` to cancel listening.
- Edit the numeric state in the right column. State and binding changes are saved immediately to the Mod's INI.
- Empty states return to their previously saved value, and non-numeric states are not written.

These edits only change files inside the Mod. They never modify `d3dx_user.ini`.

**Sync Toggles** is a separate, one-way operation. It reads runtime persistent values recorded in the configured
`d3dx_user.ini` and writes matching values back to the Mod's INI files. A constant that is not present in
`d3dx_user.ini` produces no sync change.

Sync Toggles is not guaranteed to work correctly with every mod.

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

- **Restore**
  - Loads data from `Presets_Backup.json`.
  - ⚠️ This will **overwrite** your current preset configurations.
  - After restoring, you must **re-apply the current preset** from the pending queue to reflect changes.

## Updates

- **Automatic updates**: After launching the app, wait a few seconds. Once a new version has downloaded, a system notification will let you know that it will be installed after you quit the app.
- **Manual updates**: Download an installer from the [Releases page](https://github.com/Tian-W001/PeakyModManager_v3/releases), then run it to install the update.

Character resources will be added as the game receives updates. If a new character displays the Unknown avatar, please wait for a future update.

## Previews

![Main screen](images/README/screenshot_main.png)
![Apply changes](images/README/screenshot_apply.png)
![Mod details](images/README/screenshot_detailmodal.png)
![Preset management](images/README/screenshot_presetsmodal.png)
![Settings](images/README/screenshot_settings.png)
