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

## Compatibility CI

The SDK check workflow validates metadata, declarations, 39 contract/runtime
tests and installed archives on Linux, macOS and Windows. Archive installation
uses a fresh store and works with dependency scripts disabled. Both current and
legacy SDK imports are built and loaded with the same React/context identity.

Set repository variables `LOMI_HOST_REF` and `LOMI_TOOLS_REF` to reviewed full
40-character commits after migrating those repositories. Subsequent SDK checks
also test the exact Linux archive against these consumers. The consumer job
runs the application's type checks, tests, build and Rust contract cases, plus
the CLI regressions against projects created by its pinned npm generator.
The CLI repository records that generator version and SHA-512 integrity in
`generator-source.json`; it does not need a generator source checkout. Initial bootstrap checks explicitly
skip this job until the consumer commits exist. A release requires both refs.

The consumer job rewrites only SDK dependency specifications in disposable CI
checkouts, retaining the consumers' other locked dependencies. It tests the
candidate archive, not an older package from the registry. Updating a baseline
requires a compatible published SDK dependency and a passing consumer run.

Automated runtime probes and Playwright tests use a simulated host/native bridge.
They do not qualify an installed WKWebView, WebView2 or WebKitGTK host. Native
qualification and a supported-version matrix are required before stable promotion.
