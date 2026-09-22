# Lomi plugin SDK

Local plugins are trusted JavaScript in the main application's realm. This SDK
is an integration contract, not a sandbox. Settings lists declarative metadata
without executing modules. Installation accepts prebuilt packages only.

Use `buildPlugin` from `@lomi-dev/plugin-sdk/build` with tsup 8.5.1,
TypeScript 7.0.2, React/React DOM 19.2.8 and their matching types. Keep `rootDir`
explicit in tsconfig. The esbuild plugin replaces React, React DOM client and
JSX entry points with small bindings to the host's shared instances. The SDK
context has one identity in the host and all plugins. Other dependencies are
bundled into your ESM output. Relative chunks and package assets stay local.

The helper uses tsup/esbuild for ESM. Type checking belongs to the author CLI;
run `tsc --noEmit` before calling the legacy helper directly. Runtime packages do
not include declaration files or source text. Source maps retain source paths
without embedded source content. Installation runs no compiler or package scripts.

The standalone package is `@lomi-dev/plugin-sdk@1.1.0-alpha.1`. See the
[release procedure](docs/releases.md) for distribution status and prerequisites.
The bundler bridges `@lomi-dev/plugin-sdk` through
`Symbol.for("lomi.plugin-api.v1")` and the host React context. Rebuild plugins
with this SDK for the Lomi host; the previous runtime bridge is not supported.

Pure Node-safe exports:

- `./manifest`: `parsePlugin`, `packagePath`, `jsonState` and the ID pattern.
- `./shortcuts`: shortcut validation and canonical modifier/key names.
- `./compatibility`: version baseline and native package limits.
- `./contract-fixtures.json`: versioned shared parser cases for host integration.
- `./package`: Node-only path, file and completed-package checks.
- `./plugin.schema.json`: editor schema; semantic references still need the parser.
- `./build`: the existing build helper with temporary output and last-good retention.

This repository owns the contract. The application and author tools consume
the installed package. The host imports the compiled `./manifest` and
`./shortcuts` exports; it does not keep another copy of their source. These
exports are browser-safe. Node build tools are only loaded through `./build`
and `./package`. The main SDK export requires a running host.

The application pins a tested SDK version and bundles its needed code during
its own build. Running the installed application makes no SDK registry request.
See [consumer integration](docs/consumers.md) for contract synchronization and
cross-repository validation.

Build your plugin and import its output `package` folder in Settings → Plugins.
Import does not enable execution. Review the package and
choose **Enable… → Trust and enable**. Updating an evaluated revision requires
a normal application restart after resolving unsaved work.

The `index.d.ts` file describes the complete SDK. Register only contributions
listed in `plugin.json`. Every registration returns an idempotent disposer and
belongs to the activation context. Use its `signal` for asynchronous work;
registrations after deactivation throw. Cleanup errors do not stop other cleanup.
Timers and listeners registered through the context are released by the host.
Arbitrary plugin-created resources remain the author's responsibility.

Serializable panel state is limited to 64 KiB, 4096 values and 16 nested levels.
It describes a view, not unsaved file contents. Keep dirty documents and their
save/discard handlers outside transient React mounts and register their guards
with `registerDirtyView`. A same-thread infinite loop cannot be interrupted by
a promise timeout: restart with `--disable-plugins` or `--safe-mode`.

## Build outside the host checkout

From the checkout, pack the SDK:

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm test:archive
pnpm pack:release
```

In your plugin's own folder, set the SDK dependency to
`file:/absolute/path/to/plugin-sdk/artifacts/lomi-dev-plugin-sdk-1.1.0-alpha.1.tgz`
and declare compatible React, React DOM and TypeScript versions. The archive
contains its built exports and the build helper declares its own dependencies. Provide
`plugin.json`, `src/index.tsx` exporting `activate`, and a `tsconfig.json` with
`rootDir: "src"`, `jsx: "react-jsx"`, `module: "ESNext"` and
`moduleResolution: "bundler"`. Define `build` as `node build.mjs`; that module
calls `buildPlugin({ assets: [...] })` with your package's asset paths. Then:

```sh
pnpm install --ignore-scripts
pnpm build
```

The helper produces `package/plugin.json`, native ESM in `package/dist`,
and listed assets. It replaces the previous output package on
build. Copy/install this **package folder**, not the authoring directory. It must
work offline; relative chunks remain relative to the immutable revision URL.
Use the host-compatible React/DOM peer versions. The helper shares `react`,
`react-dom`, `react-dom/client`, JSX runtime/development runtime and this SDK;
unsupported React DOM subpaths fail the author build. No Vite aliases or private
host imports are available. Other runtime dependencies are bundled by tsup.

## Manifest and lifecycle

Use `plugin.schema.json` from this package for external editor validation.
The runtime checks namespacing, duplicate IDs, contribution references and
compatibility too. `schemaVersion: 1`, `hostApi: 1` and your semantic `version`
serve different purposes. Unknown fields (including dependency declarations)
are rejected. IDs look like `author.name`; contribution IDs start with the full
owner plus a dot. An executable entry must be prebuilt `.js`/`.mjs` ESM.

`activation: "startup"` activates after the workbench is ready; `"lazy"` (also
the omitted default) activates on opening a declared view or executing a command.
Concurrent triggers share a promise. States are discovered, incompatible,
disabled, activating, active, failed and deactivating; Settings shows diagnostics.
Retry a failed activation/view from its placeholder. Cleanup releases host-owned
CSS, fills, commands, views, subscriptions, timers and close guards. Use `add`
for other cooperative resources. Handle errors from your own promises and event
handlers; a React boundary cannot catch asynchronous callbacks.

The loader serves only approved immutable package snapshots through `plugin:`
(or the engine's `plugin.localhost` mapping), with JavaScript MIME, CORS and
per-resource hashes. Importing never grants trust. Trust records the complete
package content hash; it does not verify the publisher. Disable before replacing
an installed package, then review and trust the new revision. If code was
already evaluated, **Restart Lomi** uses normal unsaved-work and session
save guards. Modules cannot be unloaded from the JavaScript engine. Cooperative
deactivation and reactivation of the same revision are supported; old immutable
revisions are removed on the next process's catalogue read.

## Views, commands and slots

`central` views open as outer tabs and can dock into terminal-tab layouts.
`sidebar` views are singleton per workspace (`multiple: false`), with independent
placement/width persisted alongside built-in sidebars. Central `multiple: false`
reuses a retained instance in the current workspace. `multiple: true` opens a new
instance each time. Version-unsupported, disabled or missing views keep their
bounded descriptor/state as removable placeholders; no fallback shell starts.

Call `onFocus` or focus an element in the panel; use semantic, keyboard-accessible
controls and optionally `data-plugin-focus` for pointer focus. `setState` updates
small persisted JSON; dirty data requires `registerDirtyView(panel.id, ...)`.
Register guards for retained instances, release them when the instance closes,
and keep their data outside transient React mounts. `save` resolves only after
saving; `isDirty` must then be false. A throw or still-dirty result blocks closure.
Disable/uninstall asks Save/Discard/Cancel before disposing the owner. Cancel and
failed saves leave it running. Explicit placeholder closure removes its state.

Commands are discoverable through **Commands** (default Ctrl+Shift+P) and Settings
→ Keybinds, including before activation. IDs preserve user overrides even when a
plugin is absent. `null` explicitly disables a binding. Conflicting defaults stay
unassigned and explain why; they cannot take another command's key. Stored
keybindings allow 2048 assignments and 256 KiB. Context uses structured fields:
`workspace`, allowed `viewTypes`, and `textInput` (false by default). Workbench
commands execute only in main. `executeCommand` currently addresses declared
plugin commands; built-in actions use the same host picker/keyboard execution
handler but are not part of the public SDK contract.

Slots: `statusbar` (always available in main), `sidebar-actions` (plugin sidebar),
`view-actions` (plugin panel heading). Declare fills with an accessible label;
use it on the component's actual control. Fills sort by stable contribution ID.
There is no permanent terminal plugin toolbar. mitt carries only small context,
contribution and theme notifications; PTY bytes never enter that event bus.
`useHostContext` and `snapshot()` expose the same current workspace/panel and
appearance. `themeRevision` identifies the native source revision; the `theme`
event's local revision also changes for a mode/preference/preview application.

`contributes.themes` names theme **folders** with `theme.jsonc` (legacy theme.json
can be migrated on duplication). These data-only contributions appear in Themes
on import without executable activation. Their generated theme IDs survive code
revisions.

## Limits and recovery

A package is bounded to 64 MiB, 2048 entries, 16 directory levels and 20 MiB per
file; metadata is 256 KiB and each contribution list has at most 128 entries.
The library permits 128 packages. Relative paths reject traversal, encoding,
symlinks, Windows reserved names/streams, and special files. Main owns execution;
Settings manages packages and validated metadata; browser child views retain
only their browser reporting privilege. These webview boundaries do not sandbox
trusted JavaScript within main.

Start `lomi --safe-mode` to recover from plugin code or CSS that blocks the
interface. Disable the faulty plugin in Settings, then close/reopen normally.
For corrupt `plugins/installed.json`, close the application, rename that file to
`installed.backup.json`, restart in safe mode and reimport desired packages.
Do not delete the package folders or session file. The catalogue error preserves
the original; missing plugins restore as placeholders. Same-thread infinite
loops require terminating the process; promises cannot interrupt them.
