import assert from "node:assert/strict";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  writeFile,
  readdir,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { root, run, pack } from "./pack-release.mjs";

const input = process.argv[2] ? resolve(process.argv[2]) : await pack();
const directory = await mkdtemp(join(tmpdir(), "lomi-sdk-archive-"));
const archive = join(directory, "sdk.tgz");
await cp(input, archive);
const bytes = await readFile(archive);
const tar = gunzipSync(bytes);
const files = [];
for (let offset = 0; offset + 512 <= tar.length;) {
  const header = tar.subarray(offset, offset + 512);
  if (header.every((byte) => byte === 0)) break;
  const name = header.subarray(0, 100).toString().replace(/\0.*$/s, "");
  const size = parseInt(
    header.subarray(124, 136).toString().replace(/\0.*$/s, "").trim(),
    8,
  );
  assert.ok(Number.isSafeInteger(size) && size >= 0);
  const type = header[156];
  assert.ok([0, 48].includes(type), `Unexpected archive entry type: ${name}`);
  assert.match(name, /^package\//);
  assert.doesNotMatch(
    name,
    /(^|\/)(node_modules|src|tests|\.git|\.github|\.env|\.npmrc)(\/|$)/,
  );
  assert.doesNotMatch(
    name,
    /(?:pnpm-lock\.yaml|tsconfig\.json|\.tsbuildinfo)$/,
  );
  files.push(name.slice(8));
  offset += 512 + Math.ceil(size / 512) * 512;
}
for (const required of [
  "dist/manifest.js",
  "dist/manifest.d.ts",
  "dist/shortcuts.js",
  "index.d.ts",
  "LICENSE",
  "fixtures/plugin-contract.json",
])
  assert.ok(files.includes(required), required);

process.env.npm_config_store_dir = join(directory, "store");
process.env.npm_config_cache = join(directory, "cache");
const results = [];
for (const alias of ["@lomi-dev/plugin-sdk"]) {
  const project = join(directory, "independent author żółć");
  await cp(join(root, "tests/fixtures/context-plugin"), project, {
    recursive: true,
    filter: (path) =>
      !path
        .split(/[\\/]/)
        .some((part) => ["node_modules", "package", "dist"].includes(part)),
  });
  const path = join(project, "package.json");
  const metadata = JSON.parse(await readFile(path, "utf8"));
  delete metadata.dependencies["@lomi-dev/plugin-sdk"];
  metadata.dependencies[alias] = `file:${archive}`;
  await writeFile(path, JSON.stringify(metadata, null, 2));
  for (const file of ["src/index.tsx", "build.mjs"]) {
    const filePath = join(project, file);
    await writeFile(
      filePath,
      (await readFile(filePath, "utf8")).replaceAll(
        "@lomi-dev/plugin-sdk",
        alias,
      ),
    );
  }
  const source = join(project, "src/index.tsx");
  await writeFile(
    source,
    (await readFile(source, "utf8")) +
      `\nexport { HostContext as bridgeContext } from '${alias}';\nexport { useState as bridgeUseState } from 'react';\n`,
  );
  await writeFile(
    join(project, "src/public-types.ts"),
    (await readFile(join(root, "tests/public-types.ts"), "utf8")).replaceAll(
      "@lomi-dev/plugin-sdk",
      alias,
    ),
  );
  run("pnpm", ["install", "--ignore-scripts"], project);
  run("pnpm", ["exec", "tsc", "--noEmit"], project);
  run("pnpm", ["build"], project);
  const offline = join(directory, `offline-${results.length}`);
  await cp(join(project, "package"), offline, { recursive: true });
  await writeFile(join(offline, "package.json"), '{"type":"module"}');
  await writeFile(
    join(project, "probe.mjs"),
    `
    import assert from 'node:assert/strict';
    import { readFile } from 'node:fs/promises';
    import { pathToFileURL } from 'node:url';
    import * as React from 'react';
    import * as ReactDOM from 'react-dom';
    import * as ReactDOMClient from 'react-dom/client';
    import * as jsx from 'react/jsx-runtime';
    import * as jsxDev from 'react/jsx-dev-runtime';
    import { parsePlugin } from '${alias}/manifest';
    import { validShortcut } from '${alias}/shortcuts';
    import { validatePackage } from '${alias}/package';
    import { compatibility } from '${alias}/compatibility';
    const { manifest } = await validatePackage('package');
    parsePlugin(manifest);
    assert.equal(validShortcut('Ctrl+KeyK'), true);
    assert.equal(compatibility.runtimeSymbol, 'lomi.plugin-api.v1');
    const sdk = { HostContext: React.createContext(null), useHostContext: () => null };
    globalThis[Symbol.for(compatibility.runtimeSymbol)] = { sdk, react: React, reactDOM: ReactDOM, reactDOMClient: ReactDOMClient, jsx, jsxDev };
    const runtime = await import('${alias}');
    assert.equal(runtime.HostContext, sdk.HostContext);
    const plugin = await import(pathToFileURL(${JSON.stringify(join(offline, "dist/index.js"))}));
    assert.equal(typeof plugin.activate, 'function');
    assert.equal(plugin.bridgeContext, sdk.HostContext);
    assert.equal(plugin.bridgeUseState, React.useState);
    const map = JSON.parse(await readFile('package/dist/index.js.map', 'utf8'));
    assert.equal(map.sourcesContent, undefined);
  `,
  );
  run(process.execPath, ["probe.mjs"], project);
  results.push({
    alias,
    checks: [
      "install-without-scripts",
      "public-types",
      "build",
      "validate",
      "detached-import",
      "react-context-identity",
    ],
  });
}
await mkdir(join(root, "artifacts"), { recursive: true });
const report = {
  schemaVersion: 1,
  date: new Date().toISOString(),
  platform: `${process.platform}-${process.arch}`,
  sourceArchive: input,
  sha256: createHash("sha256").update(bytes).digest("hex"),
  directory,
  files,
  results,
  desktopTested: false,
};
await writeFile(
  join(root, "artifacts/archive-validation.json"),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
