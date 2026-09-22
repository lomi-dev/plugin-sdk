# Contributing

Use Node 22.14+ and pnpm 11.25.0. Install with `pnpm install --frozen-lockfile`.
Run `pnpm check`, `pnpm test`, `pnpm format:check` and `pnpm test:archive`.
The archive test installs copied tarballs in fresh temporary directories with
an isolated dependency store. It exercises both current and legacy imports.

Public exports and contract fixtures are versioned together. The application
keeps a byte-for-byte copy of the fixtures for Rust-only builds; its SDK check
rejects a stale copy. Coordinate changes to fixtures with a host update and the
manual consumer compatibility checks. Do not duplicate the validators in consumers.

Use English comments and commit messages in the form
`type(scope): short imperative summary`, with subjects at most 72 characters.
Include a body explaining the change and a `Validation:` section with actual
results. Preserve configured Git identity and existing work. Do not add AI
attribution. Commit and push only when explicitly requested.

See [release procedure](docs/releases.md) for pinned consumers, prereleases,
manual publication, compatibility checks and rollback.
