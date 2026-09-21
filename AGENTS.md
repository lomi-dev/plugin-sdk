# Plugin SDK

Follow CONTRIBUTING.md. This repository is the canonical source of the public
plugin contract. The application and author tools consume an installed package.
Do not import application sources or introduce local/workspace dependencies into
published metadata. Keep browser-safe exports independent of the host runtime.
Preserve the runtime symbol, React identity, old bundler import alias and manifest
compatibility. Run contract and installed-archive tests for changes to exports,
dependencies, packaging or the build helper. Report native qualification separately.
