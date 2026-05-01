# AGENTS.md

## Quick commands

```bash

npm run dev              # Start dev (HMR for main + renderer)

npm run build            # typecheck → electron-vite build (always runs typecheck first)

npm run lint             # ESLint with cache (.eslintcache)

npm run format           # Prettier write

npm run typecheck        # Run both typecheck:node && typecheck:web (order matters)

npx vitest run           # Run tests (vitest, globals enabled)

npm run gen:characters   # Regenerate character list + i18n from scripts/characters.json

```

## Architecture

This is an **Electron-Vite** app. The build tool (`electron-vite`) understands three build targets:

| Directory | Target | Runtime | Notes |

|-----------|--------|---------|-------|

| `src/main/` | main process | Node.js | Entry: `src/main/index.ts` |

| `src/preload/` | preload script | Node.js (sandbox: false) | Bridges `window.electron` and `window.api` to renderer |

| `src/renderer/src/` | renderer | Chromium (Vite) | React 19 + Redux Toolkit |

| `src/shared/` | — | — | Pure TypeScript types shared across all targets |

**Build outputs**: `out/main/`, `out/preload/`, `out/renderer/` → packaged by electron-builder into `dist/`.

## Path aliases (defined in electron.vite.config.ts, tsconfig.web.json, vitest.config.ts)

```

@renderer → src/renderer/src

@shared   → src/shared

```

## Code generation

`src/shared/character.ts` has `// AUTO-GENERATED-START` / `// AUTO-GENERATED-END` markers. Running `npm run gen:characters` regenerates the character list from `scripts/characters.json` and updates i18n locale files (`en.json`, `zh.json`). Never manually edit between those markers.

## IPC pattern

Main process handlers are registered via side-effect imports at the top of `src/main/index.ts`:

```ts
import "./handlers/libraryHandler";
```

Each handler file calls `ipcMain.handle("handler-name", ...)`. The renderer invokes them via:

```ts
window.electron.ipcRenderer.invoke("handler-name", ...args);
```

## State management (renderer)

Redux Toolkit with `redux-persist` (localStorage). Three slices in `src/renderer/src/redux/slices/`:

- `librarySlice` — mod library, paths, modInfos (persisted keys: libraryPath, targetPath, d3dxUserPath, modInfos)

- `presetsSlice` — preset configs, diff list (persisted keys: presets, currentPresetName)

- `uiSlice` — menu selection, character filter, wallpaper (persisted key: currentWallpaper)

Import typed hooks from `@renderer/redux/hooks` (`useAppDispatch`, `useAppSelector`) — not from react-redux directly.

## Testing

Vitest with `globals: true`, `environment: "node"`. Tests are in `tests/`. Module mocking required for Electron and native Node modules (`electron`, `fs-extra`, `electron-store`).

```bash

npx vitest run          # single run

npx vitest              # watch mode

```

## Dev environment quirks

- `src/main/setup.ts` **redirects userData** to `<userData>/dev` in development to avoid data conflicts with production.

- File logging is **disabled in dev** (`log.transports.file.level = false`).

- DevTools installs React DevTools + Redux DevTools extensions automatically.

- `sandbox: false` in main window creation — needed for preload.

## Build & packaging

- `npm run build:win` → `typecheck → electron-vite build → electron-builder --win`

- `npm run build:linux` → same for Linux (AppImage)

- `electron-builder.yml` configures GitHub publisher. `npmRebuild: false` is set — do not change.

- `7zip-bin-full` is asar-unpacked (`node_modules/7zip-bin-full/**/*`).

- Release publishes via GitHub Actions (`release-build.yml`) using `GITHUB_TOKEN` secret.

## Lint/formatter conventions

- Indent: 2 spaces (`.editorconfig`)

- Quotes: **double** (prettier: `singleQuote: false`)

- Semicolons: **always** (prettier: `semi: true`)

- Trailing commas: ES5 style

- Max line length: 120 (ESLint `max-len` + prettier `printWidth`)

- Unused variables: prefix with `_` to suppress (ESLint `argsIgnorePattern: "^_"`)

- Tailwind CSS v4: uses `@tailwindcss/vite` Vite plugin, NOT PostCSS config

## Node / TypeScript version

- CI builds with Node 24. TypeScript 5.9. `package-lock.json` is used (npm, not pnpm/yarn).
