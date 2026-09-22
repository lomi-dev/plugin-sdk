# Consumer integration

`lomi-dev/plugin-sdk` is the only source of the public TypeScript contract,
manifest/shortcut validators, schema and shared contract fixtures. The application
implements the host runtime. `lomi-dev/plugin-tools` supplies the CLI;
`lomi-dev/create-lomi-plugin` owns the generator and templates. Each repository
has its own lockfile and release history.

The application imports types from `@lomi-dev/plugin-sdk`, pure runtime code from
`@lomi-dev/plugin-sdk/manifest` and `@lomi-dev/plugin-sdk/shortcuts`. It never
imports the host-dependent root module as a runtime dependency. Vite bundles the
needed validators; building or running the app does not clone this repository.

Pin the application SDK dependency to a qualified exact version. During the first
registry bootstrap an exact GitHub Release tarball URL with lockfile integrity
can be used. Local source paths, workspace links and floating Git branches are
not release dependencies. Update the app and its plugin fixture together.

## Shared fixtures

The SDK exports `./contract-fixtures.json`. Lomi commits a byte-identical copy in
`tests/fixtures/plugin-contract.json`, so Cargo tests do not require Node or npm.
`pnpm sdk:verify` compares that snapshot to the installed SDK and checks the API
version and runtime symbol. `pnpm sdk:sync-contract` explicitly updates it during
a reviewed SDK upgrade. TypeScript and Rust tests must then both pass. The
snapshot is test data, not a second implementation of the validators.

## Compatibility checks

GitHub Actions is disabled. Run `pnpm check`, `pnpm test` and `pnpm test:archive`
manually on Linux, macOS and Windows before releasing. These validate metadata,
declarations, contract/runtime behavior and installed archives. Archive installation
uses a fresh store and works with dependency scripts disabled. The Lomi SDK import is built and loaded with the same React/context identity.

Create clean, disposable clones of the application and CLI at reviewed full
40-character commits. From the SDK checkout that produced the tested archive,
run the existing consumer harness with absolute paths (POSIX shell example):

```sh
CI=true GITHUB_SHA="$(git rev-parse HEAD)" node scripts/test-consumers.mjs /absolute/path/to/disposable-lomi /absolute/path/to/disposable-plugin-tools /absolute/path/to/sdk-artifacts
```

`CI=true` acknowledges that the harness rewrites dependencies in disposable
consumer checkouts; never point it at a working checkout containing user work.
`GITHUB_SHA` is the harness's existing expected-source-commit input; setting it
locally does not require GitHub Actions. The harness checks the archive hash and
source commit, then runs the application's type checks, tests and build, its
external author test, and CLI archive regressions. It retains the other locked
dependencies and records both consumer commits in `artifacts/consumer-validation.json`.

In the prepared disposable application checkout, also run the native contract
and browser checks with the required Rust and platform development dependencies.
Before running Playwright, export `LOMI_AUTHOR_PACKAGE` with the absolute
`autor żółć panel/package` path inside the directory recorded by the CLI's
`artifacts/archive-validation.json` so the generated-author case is included:

```sh
export LOMI_AUTHOR_PACKAGE="/absolute/path/to/author-projects/autor żółć panel/package"
cargo test --manifest-path src-tauri/Cargo.toml --locked plugins::tests
pnpm exec playwright install --with-deps chromium
pnpm --filter lomi-plugin-fixture build
pnpm exec playwright test tests/ui/plugins.spec.ts tests/ui/plugin-authoring.spec.ts
```

Retain these results with the consumer report.
The CLI repository records its generator version and SHA-512 integrity in
`generator-source.json`; it does not need a generator source checkout. Updating a
baseline requires a compatible published SDK dependency and a passing consumer run.

Automated runtime probes and Playwright tests use a simulated host/native bridge.
They do not qualify an installed WKWebView, WebView2 or WebKitGTK host. Native
qualification and a supported-version matrix are required before stable promotion.
