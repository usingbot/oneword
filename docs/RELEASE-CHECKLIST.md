# Release checklist

This is a reusable checklist. Boxes describe the **future public release**;
they are not marked complete merely because a local M4b preparation check ran.
Record the exact commit, versions, commands, logs and operator for each release.

## Publication blockers and policy

- [ ] Confirm the owner-selected repository in release-metadata.json and review publication rights/secrets.
- [ ] Configure/test security.privateContact; mark verified only after private receipt.
- [ ] Configure/test conduct.privateContact separately; no public issue/advisory routing.
- [ ] Confirm contributor rights/copyright attribution and AGPL-3.0-only choice.
- [ ] Supply an accessible source offer for the exact served build, with any
  third-party corresponding-source obligations satisfied.
- [ ] Obtain explicit approval to publish/tag/release/deploy.

## Repository and verification

- [ ] Clean Git tree at the approved release commit; review tracked/untracked files.
- [ ] Install from lockfile in a clean platform-specific environment (`npm ci`).
- [ ] Typecheck and lint pass; no disabled assertions or manufactured green status.
- [ ] Unit/integration tests pass and totals are recorded.
- [ ] Dependency audit reviewed, including transitive runtime/build packages;
  resolve advisories or record an explicit reviewed exception before release.
- [ ] Production build and `npm run verify:release` pass.
- [ ] `npm run verify:csp` passes against dist; no development WebSocket allowance.
- [ ] `npm run release:check` passes with genuine verified metadata/source review; a blocked exit is not a release pass.
- [ ] `git diff --check` and `git diff HEAD --check` pass before commit.
- [ ] Full supported Chromium/WSL suite, including native visibility, passes.
- [ ] Firefox smoke passes; document other engines/devices not tested.
- [ ] Real service-worker update and cold offline smoke preserve IndexedDB.
- [ ] Supported historical migrations and failed-migration rollback pass.
- [ ] Personal Backup round-trip restores history; Study Pack contains no personal state.
- [ ] Privacy/network inspection shows only explained asset/opt-in image requests.
- [ ] Keyboard/accessibility smoke and narrow/mobile viewport smoke pass.
- [ ] Check remaining large-data, real-device and screen-reader limitations.

## Packaging and publication — not executed in M4b

- [ ] Approve the version; keep package.json/lockfile consistent.
- [ ] Finalize CHANGELOG.md with the real release date and limitations.
- [ ] Verify canonical LICENSE, COPYRIGHT and third-party notices in source/dist.
- [ ] Verify the exact immutable source archive and complete dist release artifacts;
  exclude private files, caches, test reports and node_modules; record checksums.
- [ ] Run hosted CI on the actual public repository; local checks are not hosted CI evidence.
- [ ] Create the approved tag pointing to the verified commit.
- [ ] Create the approved GitHub release with source, artifacts, checksums and notes.
- [ ] Deploy only with separate approval; use HTTPS/root scope/correct MIME/cache headers.
- [ ] Verify the deployed origin, source/license links, installability, asset integrity,
  offline reopen, update from the previous deployment, backup/recovery and no uploads.

Never clear user storage to make an upgrade pass. A source release, a hosted
instance and an npm package are separate publication decisions; none happens
automatically in the preparation workflow.
