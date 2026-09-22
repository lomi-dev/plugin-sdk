import { build } from "tsup";
import { renameSync } from "node:fs";
import {
  mkdir,
  mkdtemp,
  readFile,
  cp,
  rm,
  rename,
  lstat,
  realpath,
} from "node:fs/promises";
import {
  join,
  dirname,
  resolve,
  extname,
  basename,
  relative,
  isAbsolute,
} from "node:path";
import { parsePlugin, packagePath } from "./dist/manifest.js";
import { safePath, packageFiles, validatePackage } from "./package-files.mjs";

export async function buildPlugin({
  entry = "src/index.tsx",
  manifest = "plugin.json",
  assets = [],
  outDir = "package",
  cwd = process.cwd(),
  signal,
} = {}) {
  signal?.throwIfAborted();
  cwd = await realpath(cwd);
  const data = parsePlugin(
    JSON.parse(await readFile(await safePath(cwd, manifest), "utf8")),
  );
  const output = resolve(cwd, outDir);
  if (output === resolve(cwd) || output === resolve(cwd, "src"))
    throw new Error("Choose a separate build output directory.");
  await mkdir(dirname(output), { recursive: true });
  const lock = `${output}.lomi-lock`;
  try {
    await mkdir(lock);
  } catch (error) {
    if (error.code === "EEXIST")
      throw new Error(
        `Build is locked: ${lock}. Wait for the other build; after a terminated process, inspect .lomi-build-* backups before removing the lock.`,
      );
    throw error;
  }
  let staging;
  try {
    staging = await mkdtemp(join(dirname(output), ".lomi-build-"));
  } catch (error) {
    await rm(lock, { recursive: true });
    throw error;
  }
  let backup;
  try {
    if (data.entry) {
      const React = await import("react"),
        ReactDOM = await import("react-dom"),
        ReactDOMClient = await import("react-dom/client"),
        JSX = await import("react/jsx-runtime");
      const modules = {
        react: ["react", Object.keys(React)],
        "react-dom": ["reactDOM", Object.keys(ReactDOM)],
        "react-dom/client": ["reactDOMClient", Object.keys(ReactDOMClient)],
        "react/jsx-runtime": ["jsx", Object.keys(JSX)],
        "react/jsx-dev-runtime": ["jsxDev", ["Fragment", "jsxDEV"]],
        "@lomi-dev/plugin-sdk": ["sdk", ["HostContext", "useHostContext"]],
      };
      await build({
        entry: {
          [basename(data.entry, extname(data.entry))]: await safePath(
            cwd,
            entry,
          ),
        },
        outDir: join(staging, dirname(data.entry)),
        outExtension: () => ({ js: extname(data.entry) }),
        format: ["esm"],
        platform: "browser",
        target: "es2022",
        splitting: true,
        sourcemap: true,
        clean: false,
        dts: false,
        treeshake: false,
        silent: true,
        noExternal: [/.*/],
        config: false,
        esbuildOptions(options) {
          options.sourcesContent = false;
          options.logOverride = {
            "unsupported-dynamic-import": "error",
            "unsupported-require-call": "error",
          };
        },
        esbuildPlugins: [
          {
            name: "lomi-shared-runtime",
            setup(builder) {
              builder.onResolve(
                {
                  filter:
                    /^(react(?:-dom)?(?:\/.*)?|@lomi-dev\/plugin-sdk(?:\/.*)?)$/,
                },
                (args) => {
                  if (!modules[args.path])
                    throw new Error(
                      `Unsupported shared entry point: ${args.path}`,
                    );
                  return { path: args.path, namespace: "lomi-shared" };
                },
              );
              builder.onLoad(
                { filter: /.*/, namespace: "file" },
                async (args) => {
                  const path = await realpath(args.path);
                  const inside = relative(cwd, path);
                  if (inside.startsWith("..") || isAbsolute(inside))
                    throw new Error(
                      `Private or external source import: ${args.path}. Keep source inside the author project.`,
                    );
                  return undefined;
                },
              );
              builder.onLoad(
                { filter: /.*/, namespace: "lomi-shared" },
                (args) => {
                  const [name, keys] = modules[args.path];
                  return {
                    loader: "js",
                    contents: `const shared=globalThis[Symbol.for("lomi.plugin-api.v1")]; if(!shared) throw new Error("Lomi host is missing"); const module=shared.${name}; export default module; ${keys
                      .filter(
                        (k) =>
                          k !== "default" && /^[a-zA-Z][a-zA-Z0-9_]*$/.test(k),
                      )
                      .map((k) => `export const ${k}=module.${k};`)
                      .join("\n")}`,
                  };
                },
              );
            },
          },
        ],
      });
    }
    await cp(await safePath(cwd, manifest), join(staging, "plugin.json"));
    for (const path of assets) {
      packagePath(path);
      if (path === "plugin.json" || path === "dist" || path.startsWith("dist/"))
        throw new Error(`${path}: asset collides with generated output.`);
      const source = await safePath(cwd, path);
      if ((await lstat(source)).isDirectory()) await packageFiles(source);
      await cp(source, join(staging, path), {
        recursive: true,
        errorOnExist: true,
        force: false,
      });
    }
    await validatePackage(staging);
    signal?.throwIfAborted();
    try {
      const stat = await lstat(output);
      if (!stat.isDirectory() || stat.isSymbolicLink())
        throw new Error("Build output must be a real directory.");
      backup = `${staging}-previous`;
      renameSync(output, backup);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    try {
      renameSync(staging, output);
    } catch (error) {
      if (backup) renameSync(backup, output);
      throw error;
    }
    if (backup) await rm(backup, { recursive: true });
    return output;
  } finally {
    await rm(staging, { recursive: true, force: true });
    await rm(lock, { recursive: true, force: true });
  }
}
