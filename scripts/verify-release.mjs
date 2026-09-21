import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";

const root = resolve(import.meta.dirname, "..");
const metadata = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const directory = resolve(process.argv[2] ?? join(root, "artifacts"));
const report = JSON.parse(
  await readFile(join(directory, "release.json"), "utf8"),
);
assert.match(
  metadata.version,
  /^\d+\.\d+\.\d+-[a-zA-Z0-9.-]+$/,
  "This workflow publishes prereleases only; stable promotion needs qualification.",
);
const file = `lomi-dev-plugin-sdk-${metadata.version}.tgz`;
assert.deepEqual(
  (await readdir(directory)).filter((path) => path.endsWith(".tgz")),
  [file],
);
assert.equal(report.file, file);
assert.equal(report.name, metadata.name);
assert.equal(report.version, metadata.version);
assert.equal(report.sourceCommit, process.env.GITHUB_SHA);
const bytes = await readFile(join(directory, file));
assert.equal(createHash("sha256").update(bytes).digest("hex"), report.sha256);
assert.equal(
  `sha512-${createHash("sha512").update(bytes).digest("base64")}`,
  report.integrity,
);
console.log(`Verified tested archive ${file} from ${report.sourceCommit}.`);
