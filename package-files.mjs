import { lstat, readdir, readFile, realpath } from "node:fs/promises";
import { join, resolve, relative, dirname } from "node:path";
import { init, parse } from "es-module-lexer";
import { packagePath, parsePlugin } from "./dist/manifest.js";
import { limits } from "./compatibility.js";

export async function safePath(root, path) {
  packagePath(path);
  const base = await realpath(root);
  let target = base;
  for (const part of path.split("/")) {
    target = join(target, part);
    if ((await lstat(target)).isSymbolicLink())
      throw new Error(`${path}: symbolic links are not allowed.`);
  }
  const resolved = await realpath(target);
  if (relative(base, resolved).startsWith("..") || resolved === base)
    throw new Error(`${path}: path escapes the project.`);
  return target;
}

export async function packageFiles(root) {
  if ((await lstat(root)).isSymbolicLink())
    throw new Error("Package root cannot be a symbolic link.");
  const files = new Map();
  let entries = 0,
    total = 0;
  async function walk(directory, depth) {
    if (depth > limits.depth)
      throw new Error("Package exceeds 16 directory levels.");
    for (const name of (await readdir(directory)).sort()) {
      if (++entries > limits.entries)
        throw new Error("Package exceeds 2048 entries.");
      const path = join(directory, name);
      const key = relative(root, path).split("\\").join("/");
      packagePath(key);
      const stat = await lstat(path);
      if (stat.isSymbolicLink())
        throw new Error(`${key}: symbolic links are not allowed.`);
      if (stat.isDirectory()) await walk(path, depth + 1);
      else if (stat.isFile()) {
        if (stat.size > limits.fileBytes)
          throw new Error(`${key}: file exceeds 20 MiB.`);
        const bytes = await readFile(path);
        total += bytes.length;
        if (bytes.length > limits.fileBytes || total > limits.packageBytes)
          throw new Error("Package exceeds its size limit.");
        files.set(key, bytes);
      } else throw new Error(`${key}: only regular files are allowed.`);
    }
  }
  await walk(root, 0);
  return files;
}

export async function validatePackage(root) {
  const files = await packageFiles(root);
  const raw = files.get("plugin.json");
  if (!raw || raw.length > limits.manifestBytes)
    throw new Error("plugin.json: missing or exceeds 256 KiB.");
  const manifest = parsePlugin(JSON.parse(raw.toString("utf8")));
  for (const path of [manifest.entry, ...(manifest.stylesheets ?? [])].filter(
    Boolean,
  )) {
    if (!files.has(path)) throw new Error(`${path}: declared file is missing.`);
  }
  for (const theme of manifest.contributes?.themes ?? []) {
    if (
      !files.has(`${theme.path}/theme.jsonc`) &&
      !files.has(`${theme.path}/theme.json`)
    )
      throw new Error(`${theme.path}: theme manifest is missing.`);
  }
  const reference = (path, value) => {
    if (value.startsWith("data:")) return;
    if (/^[a-z]+:|^\/|[\\%?#]/i.test(value))
      throw new Error(
        `${path}: resource must be local and unencoded: ${value}`,
      );
    const target = relative(root, resolve(root, dirname(path), value))
      .split("\\")
      .join("/");
    packagePath(target);
    if (!files.has(target))
      throw new Error(`${path}: missing resource ${value}.`);
  };
  for (const [path, bytes] of files) {
    if (path.endsWith(".css")) {
      const css = bytes.toString("utf8").replace(/\/\*[\s\S]*?\*\//g, "");
      for (const match of css.matchAll(
        /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)|@import\s+["']([^"']+)["']/g,
      ))
        reference(path, (match[1] ?? match[2] ?? match[3] ?? match[4]).trim());
    }
  }
  await init;
  for (const [path, bytes] of files) {
    if (/\.m?js$/.test(path)) {
      for (const item of parse(bytes.toString("utf8"))[0]) {
        if (item.d === -2) continue;
        if (!item.n || !item.n.startsWith("."))
          throw new Error(
            `${path}: unresolved or nonliteral import. Bundle browser dependencies and use literal relative imports.`,
          );
        const target = relative(root, resolve(root, dirname(path), item.n))
          .split("\\")
          .join("/");
        packagePath(target);
        if (!files.has(target))
          throw new Error(`${path}: missing import ${item.n}.`);
      }
    }
  }
  return { manifest, files };
}
