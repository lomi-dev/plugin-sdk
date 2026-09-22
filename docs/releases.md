# Releases

The first standalone version is `@lomi-dev/plugin-sdk@1.1.0-alpha.0`. It preserves
host API 1 and the existing `simplebench.plugin-api.v1` bridge. The source history
was extracted from `lomi/packages/plugin-sdk`; new SDK changes belong here.

SDK 1.1.0-alpha.0 is published on npm. The verified npm organization owner is
`maciejkolerski`, with 2FA enabled. Publication used the original tested GitHub
prerelease archive from source `77d0c93461a99678b35469291219ab50b0140db8`.
Registry SHA-512 integrity matches that archive, and the application installs
the exact registry version. Never reuse or replace a published version's bytes.
This alpha publication does not establish stable desktop qualification.

## Prepare a version

1. Update `package.json` and `compatibility.js` together. Keep the runtime symbol
   and old bundler alias. Review whether a change needs a new host API or a new
   minimum host version; do not infer capabilities from an SDK version alone.
2. Run `pnpm install --frozen-lockfile`, `pnpm check`, `pnpm test`,
   `pnpm format:check`, and `pnpm test:archive`. Review `artifacts/release.json`
   and `artifacts/archive-validation.json`. The package contains compiled exports;
   installation does not compile it or access the application sources.
3. Commit the version before producing the release archive, then run the SDK
   checks manually on Linux, macOS and Windows. Require the
   [consumer compatibility checks](consumers.md#compatibility-checks) to pass
   against reviewed full host and tools commits using the exact archive selected
   for publication. Preserve each platform's validation reports.
4. Record supported host versions and actual native qualification separately.
   The initial version remains alpha and uses the `next` distribution tag.

## Manual npm publication

GitHub Actions is disabled in this repository. There is no Actions publishing
workflow or OIDC publication path. The npm owner authenticates with `npm login`
and confirms publication using interactive 2FA. Do not commit npm credentials.

For each new version, retain the tested tarball from `artifacts/`, `release.json`
and `archive-validation.json`. Verify the source commit, SHA-256 and SHA-512
and the matching consumer validation report before publishing. Do not rebuild
the selected archive between testing and publication. Replace `<new-version>`
with the new, unpublished version:

```sh
npm publish "./artifacts/lomi-dev-plugin-sdk-<new-version>.tgz" --access public --tag next --ignore-scripts --auth-type=web
```

Install that exact version in a fresh external author project and in the
application. Compare npm integrity with the tested archive and commit registry
resolution and integrity in consumer lockfiles. Only after the SDK is available,
publish compatible CLI and generator versions if their changes require releases,
and test their registry installation. Never mark the registry path verified
from local tarball or GitHub asset tests alone.

Create a GitHub prerelease at the exact source commit with the tested archive
and validation reports. Preserve existing versions and release assets, including
the original SDK 1.1.0-alpha.0 archive. Publish prereleases to `next`; stable
promotion is a separate decision after native qualification and registry tests.

## Recovery

If publication fails, inspect the registry before retrying. An existing version
is immutable: compare integrity and use a new version for changed bytes. If a
consumer regresses, restore its previous dependency and lockfile, leave existing
release artifacts available, and publish a new corrected version. Do not mutate
the runtime symbol or silently migrate persisted plugin state during rollback.
