import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

test("pure exports load without a host and the runtime entry requires one", () => {
  const child = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `
    import assert from 'node:assert/strict';
    import { parsePlugin } from '@lomi-dev/plugin-sdk/manifest';
    import { validShortcut } from '@lomi-dev/plugin-sdk/shortcuts';
    import { compatibility } from '@lomi-dev/plugin-sdk/compatibility';
    assert.equal(typeof parsePlugin, 'function');
    assert.equal(validShortcut('Ctrl+KeyK'), true);
    assert.equal(compatibility.hostApi, 1);
    assert.equal(globalThis[Symbol.for('simplebench.plugin-api.v1')], undefined);
    await assert.rejects(import('@lomi-dev/plugin-sdk'), /main application window/);
  `,
    ],
    { cwd: new URL("..", import.meta.url), encoding: "utf8" },
  );
  assert.equal(child.status, 0, child.stdout + child.stderr);
});

test("runtime export retains the exact host context and hook", () => {
  const child = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `
    import assert from 'node:assert/strict';
    const sdk = { HostContext: {}, useHostContext: () => ({ workspaceName: 'Test' }) };
    globalThis[Symbol.for('simplebench.plugin-api.v1')] = { sdk };
    const actual = await import('@lomi-dev/plugin-sdk');
    assert.equal(actual.HostContext, sdk.HostContext);
    assert.equal(actual.useHostContext, sdk.useHostContext);
  `,
    ],
    { cwd: new URL("..", import.meta.url), encoding: "utf8" },
  );
  assert.equal(child.status, 0, child.stdout + child.stderr);
});
