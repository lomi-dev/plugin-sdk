export interface BuildOptions {
  entry?: string;
  manifest?: string;
  assets?: string[];
  outDir?: string;
  cwd?: string;
  signal?: AbortSignal;
}
export declare function buildPlugin(options?: BuildOptions): Promise<string>;
