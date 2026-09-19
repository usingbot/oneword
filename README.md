# OneWord

OneWord provides focused RSVP-style reading and local study tools. It combines a reader, Anki-style flashcards using FSRS, and quizzes in a static web application. It exists to let people read and study their own material without an account or a learning-data server. The interface is currently Vietnamese; the [user guide](docs/USER-GUIDE.md) describes its controls in Vietnamese.

**Release preparation:** the public release candidate version is **0.1.0**, from package.json. The canonical source destination is [usingbot/oneword](https://github.com/usingbot/oneword). Security and Code of Conduct contacts are configured and owner-verified in [release metadata](release-metadata.json). The source repository is published; exact public HEAD is verified live by release:check. Liberation legal/source-delivery approval remains pending. No version tag, binary release or deployment is claimed. See [source publication](docs/PUBLIC-SOURCE.md) and the [release checklist](docs/RELEASE-CHECKLIST.md).

## What it does

- Import UTF-8 TXT, paste text, or extract a PDF's text layer locally. Preview and edit PDF text before saving; preserve the original text and revisions.
- Read with adjustable RSVP groups, sentences, pace, punctuation pauses, context, keyboard controls and fullscreen. Losing visibility pauses playback. RSVP is an optional presentation mode, not a claim of improved comprehension or memory.
- Create flashcards, reveal the answer after recall, and choose Again/Hard/Good/Easy. The local `ts-fsrs` scheduler supports due queues, a new-card limit, history and guarded undo.
- Create single-answer quizzes with stable choice IDs, optional question/choice shuffling, practice/test modes and resumable attempts. Quiz answers never become FSRS ratings.
- Exchange **Study Pack JSON** containing content only. **Personal Backup JSON** separately includes reading state, FSRS history and quiz attempts; validated restore merges atomically and rejects conflicting histories.
- Install the production PWA where supported. After its initial offline preparation, the reader, extracted PDF text, study tools and backup/restore can work offline. Updates wait for a safe user-controlled reload.

The software should not lock users into OneWord: users can export Study Packs, export Personal Backups and self-host the app. These are documented JSON formats, not automatic compatibility with Anki `.apkg`, AnkiWeb or every other study app.

## Run locally

Use Git and Node.js **24.21.0** with its npm for the documented CI environment. The accepted Windows baseline also ran on Node 22.17.0/npm 11.15.0. Obtain this source tree and run from its root:

```sh
npm ci
npm run dev
```

Open the loopback URL Vite prints (normally `http://127.0.0.1:5173`). No database server, API server, cloud account or environment secrets are required. Do not share a `node_modules` directory between Windows and Linux.

For a production build and local preview:

```sh
npm run build
npm run verify:release
npm run preview
```

The static output is **`dist/`**. Publish its complete contents at an HTTPS origin root, including the service worker, PDF worker/resources and licenses. The development and preview servers are local tools. Read [self-hosting](docs/SELF-HOSTING.md) for MIME types, cache headers, updates, source availability and production checks; no deployment runs automatically.

## Privacy and portable data

Learning data stays in this browser's IndexedDB by default. OneWord does not require uploading PDFs, text, cards, reviews, quiz attempts or backups, and includes no analytics or AI API. It fetches same-origin static application resources, including offline PDF resources. External HTTPS images load only after explicit user action and require CORS; their servers can see the connection's IP and request headers. A hosting provider may log static requests. See [PRIVACY.md](PRIVACY.md) for these boundaries.

Browser data belongs to an origin and browser profile. A different hostname or port is a different library. Keep private backups outside the browser: site-data clearing, eviction, device loss or private browsing can remove local data. Backups are **not encrypted**. [Recovery guidance](docs/RECOVERY.md) explains save failures and restore conflicts.

## Current limitations

- No OCR, password entry for encrypted PDFs, cloud sync, accounts, backend or AI integration.
- PDF text order, multi-column layouts, tables and font mappings can be imperfect. Inspect the preview; extraction does not preserve page appearance or store the original PDF binary. Limits include 50 MiB/PDF, 500 pages and 2 MiB extracted text.
- Remote images depend on network availability and server CORS. They are not embedded in Study Packs or guaranteed offline.
- Browser storage can be cleared; local backups are unencrypted and need safe handling. Personal Backup is v5 (reads v1–v4); Study Pack v1/v2 excludes personal progress. Older apps cannot necessarily read newer data.
- Physical-device testing is limited. Mobile viewports are emulated; WebKit is not fully verified and manual screen-reader testing remains limited. Firefox has a smoke test, not full parity with the Chromium suite.
- Large restore operations can take significant time. The accepted M4a test restored an **11,087,067-byte (about 11 MB) backup in approximately 18.51 seconds**, using a Windows production build and WSL Chromium with a synthetic mixed library. Observations varied with host load (5.77–31.31 seconds); this is not a mobile or universal performance guarantee. See the fixture and methodology in [PERFORMANCE.md](docs/PERFORMANCE.md).

## Verify changes

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

The supported full browser gate on the existing Windows/Ubuntu WSL setup is:

```powershell
npm run test:prepare-updates
wsl -d Ubuntu -- bash /mnt/d/oneword/scripts/test-wsl.sh
wsl -d Ubuntu -- bash /mnt/d/oneword/scripts/test-wsl.sh --config=playwright.firefox.config.ts
```

Those paths describe this development checkout. Browser binaries and a working desktop/WSLg must be prepared first; see [TEST-ENVIRONMENT.md](docs/TEST-ENVIRONMENT.md) and [CONTRIBUTING.md](CONTRIBUTING.md). The full suite includes actual native visibility checks and two-build update fixtures, not just headless screenshots. [CI.md](docs/CI.md) explains why GitHub Actions runs the core gate while this browser gate remains separate.

## Project map and documentation

| Location | Responsibility |
| --- | --- |
| `src/ui/` | Reader, PDF preview, study/review/quiz interfaces |
| `src/application/` | Use cases, validation, document/content/personal-state contracts, scheduler adapter |
| `src/domain/` | Reader segmentation and timing |
| `src/storage/` | IndexedDB adapters, migrations and atomic persistence |
| `src/application/pdf.ts`, `src/ui/PdfImport.tsx` | Local PDF extraction and preview boundary |
| `src/offline/`, `scripts/pwa.ts` | Static-only service worker and build integrity |
| `tests/`, `src/**/*.test.ts` | Browser and unit/integration tests |
| `docs/`, `.agents/skills/`, `AGENTS.md` | Public guides, milestone evidence and contributor/agent rules |

Start with [architecture](docs/ARCHITECTURE.md), [data contracts](docs/DATA-CONTRACTS.md), [Study Pack schema](docs/STUDY-PACK-SCHEMA.md), [FSRS policy](docs/FLASHCARD-SCHEDULING.md), [Quiz](docs/QUIZ.md), [offline updates](docs/OFFLINE.md) and [accessibility](docs/ACCESSIBILITY.md). Detailed milestone documents are mainly Vietnamese; historical entries are marked and do not supersede current contracts.

## License and community

OneWord application source is licensed under **GNU AGPL version 3 only** (`AGPL-3.0-only`): [LICENSE](LICENSE), [COPYRIGHT](COPYRIGHT). Dependencies, PDF fonts/CMaps and other third-party materials retain their own licenses; see [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md). Importing a PDF, image or user-created Study Pack does **not** automatically apply the application license to that content.

Read [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md) and the [Contributor Covenant 2.1 Code of Conduct](CODE_OF_CONDUCT.md). [CHANGELOG.md](CHANGELOG.md) and [versioning](docs/VERSIONING.md) describe the proposed initial release. Run `npm run release:check` after building for publication blockers; [metadata instructions](docs/RELEASE-METADATA.md) explain this separate gate.
