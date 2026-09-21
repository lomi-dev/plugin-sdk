# Releases

The first standalone version is `@lomi-dev/plugin-sdk@1.1.0-alpha.0`. It preserves
host API 1 and the existing `simplebench.plugin-api.v1` bridge. The source history
was extracted from `lomi/packages/plugin-sdk`; new SDK changes belong here.

Registry bootstrap is pending authenticated access to the npm scope. GitHub
organization ownership does not establish npm organization ownership. Candidate
archives may be distributed as GitHub prerelease assets with recorded SHA-256
and SHA-512 integrity. Those assets are not an npm publication or stable desktop
qualification. Never reuse or replace a published version's bytes.

## Prepare a version

1. Update `package.json` and `compatibility.js` together. Keep the runtime symbol
   and old bundler alias. Review whether a change needs a new host API or a new
   minimum host version; do not infer capabilities from an SDK version alone.
2. Run `pnpm install --frozen-lockfile`, `pnpm check`, `pnpm test`,
   `pnpm format:check`, and `pnpm test:archive`. Review `artifacts/release.json`
   and `artifacts/archive-validation.json`. The package contains compiled exports;
   installation does not compile it or access the application sources.
3. Commit the version and run SDK CI on all three operating systems. Pin reviewed
   host and tools commits through `LOMI_HOST_REF`/`LOMI_TOOLS_REF`; require the
   consumer job to pass. This job tests the same archive that can be published.
4. Record supported host versions and actual native qualification separately.
   The initial version remains alpha and uses the `next` distribution tag.

## First npm publication

The package owner must authenticate with `npm login`, confirm scope access and
configure 2FA. For this existing GitHub prerelease, download its original archive and
`release.json` from the release assets. Verify both hashes before publishing;
do not replace these bytes with a later build of the same version. For a new
version without a release, use the exact tested CI archive. Publish with:

```sh
npm publish ./lomi-dev-plugin-sdk-1.1.0-alpha.0.tgz --access public --tag next
```

Install that exact version in a fresh external author project and in the
application. Commit registry resolution and integrity in consumer lockfiles.
Only after the SDK is available, publish compatible CLI and generator versions
and test their registry installation. Never mark the registry path verified
from local tarball or GitHub asset tests alone.

## Subsequent publication

Configure the npm trusted publisher for GitHub owner `lomi-dev`, repository
`plugin-sdk`, workflow `publish.yml`, environment `npm`, with direct publishing
permission. Then set `NPM_PUBLISH_READY=true` in this repository. The manual
workflow accepts full host/tools commits, runs platform and consumer tests, and
publishes their exact Linux archive with provenance; the publish job does not
rebuild the package. It rejects a source commit, hash or version mismatch.

The workflow uses Node 24 and npm 11.5.1, satisfying the documented OIDC minimum.
See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) for account
configuration. Publish prereleases to `next`; stable promotion is a separate,
explicit decision after native qualification and registry smoke tests.

## Recovery

If publication fails, inspect the registry before retrying. An existing version
is immutable: compare integrity and use a new version for changed bytes. If a
consumer regresses, restore its previous dependency and lockfile, leave existing
release artifacts available, and publish a new corrected version. Do not mutate
the runtime symbol or silently migrate persisted plugin state during rollback.
