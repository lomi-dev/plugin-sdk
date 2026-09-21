import type { PluginManifest } from "./index.js";
export declare function safePath(root: string, path: string): Promise<string>;
export declare function packageFiles(
  root: string,
): Promise<Map<string, Uint8Array>>;
export declare function validatePackage(root: string): Promise<{
  manifest: PluginManifest;
  files: Map<string, Uint8Array>;
}>;
