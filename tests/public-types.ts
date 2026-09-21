import type {
  Json,
  PluginManifest,
  PluginContext,
  ViewProps,
} from "@lomi-dev/plugin-sdk";
import {
  parsePlugin,
  jsonState,
  packagePath,
} from "@lomi-dev/plugin-sdk/manifest";
import {
  validShortcut,
  modifiers,
  keyNames,
} from "@lomi-dev/plugin-sdk/shortcuts";
import { compatibility, limits } from "@lomi-dev/plugin-sdk/compatibility";
import { buildPlugin, type BuildOptions } from "@lomi-dev/plugin-sdk/build";
import {
  safePath,
  packageFiles,
  validatePackage,
} from "@lomi-dev/plugin-sdk/package";

declare const input: unknown;
const manifest: PluginManifest = parsePlugin(input);
jsonState(input);
const state: Json = input;
packagePath("dist/index.js");
const shortcut: boolean = validShortcut("Ctrl+KeyK");
const options: BuildOptions = {
  assets: ["LICENSE"],
  signal: new AbortController().signal,
};
const output: Promise<string> = buildPlugin(options);
const path: Promise<string> = safePath("/tmp/project", "plugin.json");
const files: Promise<Map<string, Uint8Array>> = packageFiles("/tmp/project");
const validated: Promise<{
  manifest: PluginManifest;
  files: Map<string, Uint8Array>;
}> = validatePackage("/tmp/project");
declare const context: PluginContext;
declare const props: ViewProps;
void [
  manifest,
  state,
  shortcut,
  modifiers,
  keyNames,
  compatibility,
  limits,
  output,
  path,
  files,
  validated,
  context,
  props,
];
// @ts-expect-error Unknown build options are rejected by the public declaration.
buildPlugin({ unknown: true });
