import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { run, root } from "./pack-release.mjs";

if (process.env.CI !== "true")
  throw new Error("Run consumer overrides in disposable CI checkouts only.");
const host = resolve(process.argv[2] ?? "../lomi");
const tools = resolve(process.argv[3] ?? "../plugin-tools");
const artifacts = resolve(process.argv[4] ?? "../sdk-artifacts");
const release = JSON.parse(
  await readFile(join(artifacts, "release.json"), "utf8"),
);
assert.match(
  release.file,
  /^lomi-dev-plugin-sdk-\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?\.tgz$/,
);
const archive = join(artifacts, release.file);
assert.equal(
  createHash("sha256")
    .update(await readFile(archive))
    .digest("hex"),
  release.sha256,
);
assert.equal(release.sourceCommit, process.env.GITHUB_SHA);
for (const repo of [host, tools])
  assert.equal(
    run("git", ["status", "--porcelain"], repo).trim(),
    "",
    "Consumer checkout must be clean before candidate installation.",
  );
const hostRef = run("git", ["rev-parse", "HEAD"], host).trim();
const toolsRef = run("git", ["rev-parse", "HEAD"], tools).trim();
for (const file of [
  join(host, "package.json"),
  join(host, "tests/fixtures/context-plugin/package.json"),
]) {
  const metadata = JSON.parse(await readFile(file, "utf8"));
  assert.ok(
    metadata.dependencies["@lomi-dev/plugin-sdk"],
    "Consumer must already use the standalone SDK.",
  );
  metadata.dependencies["@lomi-dev/plugin-sdk"] = `file:${archive}`;
  await writeFile(file, JSON.stringify(metadata, null, 2) + "\n");
}
process.env.LOMI_SDK_TARBALL = archive;
await mkdir(join(root, "artifacts"), { recursive: true });
const checks = [];
async function check(name, args, cwd) {
  console.log(`Checking ${name}`);
  const output = run("pnpm", args, cwd);
  await writeFile(join(root, "artifacts", `${name}.log`), output);
  checks.push(name);
}
await check(
  "host-install",
  ["install", "--no-frozen-lockfile", "--ignore-scripts"],
  host,
);
await check("host-types-contract", ["check"], host);
await check("host-tests", ["test"], host);
await check("host-build", ["build"], host);
await check("host-independent-plugin", ["sdk:test:consumer", archive], host);
await check("tools-install", ["install", "--frozen-lockfile"], tools);
await check("tools-check", ["check"], tools);
await check("tools-tests", ["test"], tools);
await check("tools-archives", ["test:archives"], tools);
const toolReport = JSON.parse(
  await readFile(join(tools, "artifacts/archive-validation.json"), "utf8"),
);
await writeFile(
  join(root, "artifacts/consumer-validation.json"),
  JSON.stringify(
    {
      schemaVersion: 1,
      sdkCommit: release.sourceCommit,
      sdkSHA256: release.sha256,
      hostRef,
      toolsRef,
      checks,
      desktopTested: false,
    },
    null,
    2,
  ) + "\n",
);
if (process.env.GITHUB_ENV)
  await writeFile(
    process.env.GITHUB_ENV,
    `LOMI_AUTHOR_PACKAGE=${join(toolReport.directory, "autor żółć panel/package")}\n`,
    { flag: "a" },
  );
