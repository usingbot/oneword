# M4b — open-source release preparation

## Scope and starting state

Inspected before changes: `D:/oneword`, branch `main`, clean working tree,
HEAD `d4b897c` (accepted M4a). The requested eight-entry log was inspected.
M4b prepares publication; it does not publish or change learning behavior.
No agent delegation, new dependency version, secret read, commit, push, tag,
GitHub release or deployment was performed.

## 1. Project license

GNU AGPL version 3 only, SPDX `AGPL-3.0-only`. `LICENSE` was downloaded from
<https://www.gnu.org/licenses/agpl-3.0.txt> and compared directly with that source.
SHA-256: `0d96a4ff68ad6d4b6f1f30f713b18d5184912ba8dd389f86aa7710db079abcb0`.
`COPYRIGHT` identifies OneWord contributors and does not claim user content or
third-party materials. package.json and lockfile root metadata agree.

## 2. Files added and changed

- Public entry points: README, LICENSE, COPYRIGHT, THIRD-PARTY-NOTICES, PRIVACY,
  SECURITY, CONTRIBUTING, CODE_OF_CONDUCT and CHANGELOG.
- Public guides: SELF-HOSTING, VERSIONING, CI, RELEASE-CHECKLIST and USER-GUIDE;
  architecture and decisions updated with current public context; historical
  milestone sections retained.
- GitHub core workflow, bug/feature templates and PR template.
- Build/validation: package metadata, Vite license plugin,
  `scripts/license-assets.mjs` and its TypeScript declaration,
  `scripts/verify-release.mjs`, Playwright artifact-directory setup.
- TEST-ENVIRONMENT and this report record verification. No `src/`, test-case,
  AGENTS or project-skill changes. Full Git inventory is at the end.

## 3. README and public documentation

README now explains the local-first purpose, supported inputs, RSVP/FSRS/Quiz,
content versus personal exports, offline updates, setup/build/testing, source
map and limitations without learning-speed claims. The former detailed
Vietnamese usage instructions were moved to USER-GUIDE with relative links
adjusted. The UI and detailed historical technical docs remain Vietnamese.
Architecture adds a public boundary map without duplicating all specifications.

## 4. Privacy model

PRIVACY covers IndexedDB, local parsing/downloads, same-origin static precache,
explicit external HTTPS image requests, CORS/IP/header exposure, HTTP caching,
host logs and device/origin trust. It explains storage loss, unencrypted backups
and content/personal-state separation. No absolute privacy guarantee is made.

## 5. Security policy

SECURITY sets the proposed latest-0.x/main support policy, safe synthetic-report
requirements and local-first threat boundaries. **Private contact is a publication
TODO**, not an invented email or enabled reporting service. Reporters must not
send private PDFs/backups or disclose exploit details publicly while arranging
a private route.

## 6. Contribution and conduct

CONTRIBUTING documents platform-specific installs, branches/worktrees,
UI/application/domain/storage boundaries, migrations, local-first constraints,
test gates, docs and AGPL contributions. Contributor Covenant **2.1** uses the
[canonical upstream text](https://www.contributor-covenant.org/version/2/1/code_of_conduct/),
preserving its body/attribution except the designated contact field; an initial
note marks the missing private enforcement contact as a publication blocker.

## 7. Self-hosting

SELF-HOSTING includes `npm install` / preferred lockfile `npm ci`, build,
notice verification, local preview and serving the complete dist at HTTPS `/`.
It covers MIME, root SW scope, hashed versus revalidated cache headers,
same-origin PDF worker/font/CMap assets, atomic updates and origin-specific
storage. No SPA fallback is needed; missing assets must not become HTML.
No database/API/cloud account is required. No untested vendor config is called
verified. Exact corresponding source/license links remain publication work.

## 8. CI design and validation

One GitHub Ubuntu24.04/Node24.21 job: lockfile install, typecheck, lint, all unit
tests, production build, exact notice verification, full npm audit and Git diff
checks. Official checkout/setup-node v6 actions are SHA-pinned; repository access
is read-only and checkout credentials are not persisted. No deployment/secrets.

YAML parsed with available PyYAML6.0.3; trigger, permissions, action pins and
command sequence were asserted. The npm commands ran from an isolated copy of
intentional files with a fresh Linux install under `.tools/m4b-linux-ci`:
Ubuntu **26.04.1 WSL**, Node24.21.0/npm11.19.0; all passed. This validates Linux
commands, **not the GitHub-hosted Ubuntu24.04 runner**, which has not run.
Git whitespace checks ran in the original repository; the isolated copy had no
Git history. Read-only test discovery in that fresh copy created its previously
absent artifacts directory and listed all 81 cases.

Browser CI was evaluated, not added: headed fullscreen/window-blur and native
hidden-state checks need a validated desktop/window-manager harness. Current
WSLg coverage is retained in the separate complete release gate; no tests were
skipped or weakened. See CI.md for the supported Playwright setup and boundary.

## 9. Versioning proposal

Keep the existing **0.1.0** as the proposed initial public version. No version
bump or publication occurred. VERSIONING defines pre-1.0 SemVer, independent
schema/cache versions and real release identity. `private: true` remains to
prevent accidental npm publication.

## 10. Release checklist and changelog

RELEASE-CHECKLIST covers policy, clean tree, audit, all tests, offline/update,
migration, backup, privacy, accessibility/mobile, version/changelog, notices,
artifacts, hosted CI and explicit publication approval. Its boxes describe a
future release and remain unchecked. CHANGELOG summarizes accepted milestones
under Unreleased/proposed0.1.0 without invented dates.

## 11. Third-party review

Reviewed pinned React/ReactDOM/Scheduler MIT, Dexie Apache-2.0 plus NOTICE,
ts-fsrs MIT and PDF.js Apache-2.0. Existing Adobe CMap and PDFium/Foxit notices
remain. The installed Liberation font notice is **GPLv2 with font exceptions**,
not OFL; required corresponding font-source arrangements must be completed
before public artifact distribution. No dependency was relicensed or upgraded.

The build adds nine selected notice files (54,954 bytes); the verifier checks
**13 exact files** including the four existing PDF notices and their SW integrity
entries. No whole toolchain/dependency license tree is copied into the app.

## 12. Runtime changes

None in `src/`, data schemas, FSRS, Quiz, network policy or UI. Vite emits license
assets; the existing static PWA manifest naturally includes them and changes its
build hash. Playwright configuration creates ignored `artifacts/` for fresh
clones. A new build-validation script checks package metadata and notice bytes.
These changes are exercised by builds, fresh-copy discovery and browser gates.

## 13. Unit/integration verification

Windows Node22.17.0/npm11.15.0: typecheck/lint PASS; **180/180 tests,13 files**,
9.25s. Fresh Linux copy: **180/180 tests,13 files**,4.61s; typecheck/lint PASS.
No test cases/assertions were altered. An initial lint error in the new notice
script was fixed by explicitly importing `node:process`, then gates reran.

## 14. Browser verification

Full WSL primary: **81/81 PASS,9.0 minutes**, including native visibility;
**0 skip,0 retry**. Chromium153.0.8010.12, Playwright1.63.0, one worker,
sandbox enabled. Separate Firefox155.0 smoke: **1/1 PASS,10.9s**, covering cold
offline shell, PDF ingestion, Reader, FSRS and Quiz. This is not full Firefox parity.

The complete existing gate rechecked raw PDF/script handling, stable Quiz choice
grading/order/reload, attempts in Backup but not Study Pack, no Quiz FSRS events,
review/undo/stale-tab guards, migrations/recovery, keyboard/narrow viewports,
privacy/network, two-build safe updates and actual fullscreen/hidden-window state.
No tests were skipped, retried or changed to obtain these results.

## 15. Build, audit and additional checks

Windows and fresh Linux production builds PASS; `npm audit` reports **0
vulnerabilities** in both. `npm run verify:release` passes all 13 notice checks.
Both update fixtures built successfully. Main JS remains395.27kB /125.68kB gzip;
no application bundle-size increase. Dist contains211 files,4,250,370 bytes
(210 precached resources plus SW); added notices account for54,954 bytes plus
their manifest entries. Final tracked and untracked whitespace checks, local
Markdown links and scope review PASS. All 29 changed/new files are intentional;
no excluded paths, credential-pattern matches or staged files. Pattern matching
does not prove a repository is free of all possible secrets.

Local evidence is ignored, not release payload: `artifacts/m4b-{typecheck,lint,
test,build,audit,release-notices,update-fixtures,linux-ci,browser,firefox}.log`, fresh-copy
test-discovery log and `m4b-package-review.json`. Logs under artifacts remain on
this workstation; public reproduction uses checked-in scripts/tests and commands.
A PowerShell log filename containing the npm script's colon initially prevented
notice verification from launching; it was rerun explicitly with a valid log
filename and passed. This was not counted as a passing verification attempt.

## 16. Known limitations and publication TODOs

No OCR/cloud sync; imperfect PDF layouts/fonts; external images need network/CORS;
browser data can be cleared and backups are unencrypted. Physical mobile,
WebKit and manual screen-reader coverage remain limited; Firefox is one smoke
case. The accepted11.09MB restore example is18.51s in the documented Windows-build/
WSL-browser environment, with prior observations5.77–31.31s; not a device-independent
guarantee. M4b does not improve that runtime or increase data limits.

The current full-suite sample restored the same 11,087,067-byte synthetic backup
in 5.46s with exact round-trip and no page errors, saved separately as
`artifacts/m4b-performance.json`. It is a single observation, not evidence that
M4b's documentation/build changes made restore faster. Historical accepted 18.51s
and variation remain visible in README and PERFORMANCE.

Private security/CoC contacts, actual public repository/source links, rights and
font-source distribution review, hosted CI execution and separate publication
approval remain checklist items. Preparation is not an approved public release.

## 17. git diff --stat

Git's ordinary diff excludes the 21 new files. The eight modified tracked files:

```text
 README.md                | 127 ++++++++++++++++++++---------------------------
 docs/ARCHITECTURE.md     |  17 +++++++
 docs/DECISIONS.md        |   9 ++++
 docs/TEST-ENVIRONMENT.md |  24 ++++++++-
 package-lock.json        |   1 +
 package.json             |   4 +-
 playwright.config.ts     |   4 ++
 vite.config.ts           |   8 +++
 8 files changed, 120 insertions(+), 74 deletions(-)
```

## 18. git status --short

HEAD remains d4b897c; all changes are unstaged. No commit/tag/push/release/deploy.

```text
 M README.md
 M docs/ARCHITECTURE.md
 M docs/DECISIONS.md
 M docs/TEST-ENVIRONMENT.md
 M package-lock.json
 M package.json
 M playwright.config.ts
 M vite.config.ts
?? .github/
?? CHANGELOG.md
?? CODE_OF_CONDUCT.md
?? CONTRIBUTING.md
?? COPYRIGHT
?? LICENSE
?? PRIVACY.md
?? SECURITY.md
?? THIRD-PARTY-NOTICES.md
?? docs/CI.md
?? docs/M4B-REPORT.md
?? docs/RELEASE-CHECKLIST.md
?? docs/SELF-HOSTING.md
?? docs/USER-GUIDE.md
?? docs/VERSIONING.md
?? scripts/license-assets.d.mts
?? scripts/license-assets.mjs
?? scripts/verify-release.mjs
```

The `.github/` entry contains four intentional files: the core workflow, two issue templates and the PR template. Total: 8 modified + 21 new = 29 files.
