# Contributing to OneWord

Read the [README](README.md), [architecture](docs/ARCHITECTURE.md),
[privacy policy](PRIVACY.md) and [Code of Conduct](CODE_OF_CONDUCT.md).
Security reports use [SECURITY.md](SECURITY.md), not public issue comments.

## Set up

Use Git, Node.js 24.21.0 and npm (the reference Linux setup uses npm 11.19.0).
From a clone of the repository:

```sh
npm ci
npm run dev
```

Do not copy node_modules between Windows and Linux: build-tool native binaries
are platform-specific. Use a separate checkout/install for each environment.
There are no application API keys or private services to configure.

Work on a focused branch; automation uses `codex/` by default. Inspect Git status
before editing and preserve other people's uncommitted work. Separate worktrees
are useful for independent changes; each needs its own dependency install.
Do not commit node_modules, dist, .tools, caches, local secrets or transient
browser reports. Use synthetic, redistributable fixtures rather than books or
personal backups. A normal contribution should include a clear problem,
behavior change, validation results and any compatibility limits.

## Boundaries

- UI calls application/use-case boundaries. Reader timing stays in the domain
  engine; PDF parsing stays in its adapter/worker. Avoid scattering raw storage
  access through UI components.
- Keep FSRS behind its adapter. Reveal precedes rating, ratings remain distinct,
  writes and audit logs are atomic, and undo remains safe. Quiz grading never
  creates an FSRS rating.
- Study Pack is shared content; schedules, reviews and attempts are personal
  state in Personal Backup. Keep stable IDs and validate relationships.
- No silent network upload, tracking, backend, accounts, AI APIs or sync without
  explicit design approval. Images retain opt-in HTTPS/CORS behavior.
- Preserve original text. Do not infer better comprehension from display speed.

Agents should follow [AGENTS.md](AGENTS.md) and relevant project workflows in
`.agents/skills`. These are instructions, not substitutes for actual tests.

## Data and updates

When changing data contracts, add explicit versioned migrations and fixtures for
supported historical states. Validate before committing the transaction; test
rollback, missing references, corrupt records and future versions. Never use
deleteDatabase or silent empty-state replacement as product recovery. Distinguish
application release/cache versions from DB and interchange schema versions.
Document old/new compatibility and backup recovery. Test service-worker updates
with actual builds and actual IndexedDB, including active sessions and other tabs.

## Required checks

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run verify:release
npm audit
git diff --check
git diff HEAD --check
```

Browser changes also require the complete supported suite. On the reference
Windows/Ubuntu WSLg environment, build on Windows, then:

```powershell
npm run test:prepare-updates
wsl -d Ubuntu -- bash /mnt/d/oneword/scripts/test-wsl.sh
wsl -d Ubuntu -- bash /mnt/d/oneword/scripts/test-wsl.sh --config=playwright.firefox.config.ts
```

Those absolute paths describe the reference checkout; adapt them to your clone.
On a Linux desktop with matching Playwright browsers/dependencies installed, use
`npm run test:prepare-updates`, `npm run test:e2e`, then
`npm run test:e2e -- --config=playwright.firefox.config.ts` directly. Native
visibility requires a real supported desktop session. See
[TEST-ENVIRONMENT.md](docs/TEST-ENVIRONMENT.md) for setup and evidence; do not label
an unrun platform as supported. Do not skip or weaken tests to get green results.

Update behavior/schema/privacy/self-hosting docs with changes. Update
[CHANGELOG.md](CHANGELOG.md) under Unreleased; do not invent release dates. Check
[versioning](docs/VERSIONING.md) and the [release checklist](docs/RELEASE-CHECKLIST.md).

## Licensing

Contribute only material you have the right to provide under this project's
AGPL-3.0-only terms. Retain third-party attribution and identify exceptions.
Contributors retain copyright; no copyright assignment is requested here.
Do not relicense user documents, fonts or imported Study Packs as application code.
