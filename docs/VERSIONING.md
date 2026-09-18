# Versioning and release identity

Proposed initial public version: **0.1.0**, already the package/project version.
M4b does not bump it, tag it or publish it. `private: true` prevents accidental
npm publication; it does not make the source repository proprietary.

Use [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html). While below
1.0, use patch releases for compatible fixes and minor releases for new features
or intentional compatibility breaks; document any break and migration path.
Do not silently repurpose a released version. After 1.0, incompatible public
contract changes require a major version. The public contracts include exported
data formats and documented behavior, not just TypeScript function signatures.

DB schema, Study Pack/Backup schema and service-worker build hashes have their
own versioning. An app patch does not itself require a database migration.
Preserve supported older imports and test any schema change explicitly.

At release time, update package.json and the lockfile root consistently, record
the exact commit and checksums, finalize CHANGELOG.md with the actual date, then
create a matching tag/release only after approval. Never overwrite published
release artifacts. Pre-release labels such as `0.1.0-rc.1` may be used for an
explicitly approved release candidate; none is created in M4b.
