import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { resolve } from "node:path";
import { compatibility } from "../compatibility.js";

const root = resolve(import.meta.dirname, "..");
const metadata = JSON.parse(
  await readFile(resolve(root, "package.json"), "utf8"),
);
assert.equal(metadata.name, "@lomi-dev/plugin-sdk");
assert.equal(metadata.version, compatibility.sdk);
assert.equal(
  metadata.repository.url,
  "git+https://github.com/lomi-dev/plugin-sdk.git",
);
assert.equal(metadata.publishConfig.access, "public");
assert.equal(metadata.scripts.install, undefined);
assert.equal(metadata.scripts.postinstall, undefined);
for (const dependencies of [metadata.dependencies, metadata.peerDependencies]) {
  for (const value of Object.values(dependencies ?? {}))
    assert.doesNotMatch(value, /^(file:|link:|workspace:)/);
}
for (const entry of Object.values(metadata.exports)) {
  for (const path of typeof entry === "string" ? [entry] : Object.values(entry))
    await access(resolve(root, path));
}
console.log("Public metadata, built exports and compatibility version passed.");
