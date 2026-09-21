import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

export const root = resolve(import.meta.dirname, "..");
export function run(command, args, cwd = root, options = {}) {
  const cli = command === "pnpm" ? process.env.npm_execpath : undefined;
  const env = { ...process.env };
  delete env.NODE_PATH;
  const result = spawnSync(
    cli ? process.execPath : command,
    cli ? [cli, ...args] : args,
    {
      cwd,
      env,
      encoding: "utf8",
      timeout: 180000,
      maxBuffer: 8 * 1024 * 1024,
      ...options,
    },
  );
  if (result.status !== 0)
    throw new Error(
      `${command} ${args.join(" ")}\n${result.stdout}\n${result.stderr}\n${result.error ?? ""}`,
    );
  return result.stdout;
}

export async function pack() {
  const directory = join(root, "artifacts");
  await mkdir(directory, { recursive: true });
  run("pnpm", ["pack", "--pack-destination", directory]);
  const metadata = JSON.parse(
    await readFile(join(root, "package.json"), "utf8"),
  );
  const file = `${metadata.name.replace("@", "").replace("/", "-")}-${metadata.version}.tgz`;
  const path = join(directory, file);
  const bytes = await readFile(path);
  const report = {
    schemaVersion: 1,
    name: metadata.name,
    version: metadata.version,
    file,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    integrity: `sha512-${createHash("sha512").update(bytes).digest("base64")}`,
    bytes: bytes.length,
    sourceCommit: run("git", ["rev-parse", "HEAD"]).trim(),
  };
  await writeFile(
    join(directory, "release.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  return path;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  console.log(await pack());
