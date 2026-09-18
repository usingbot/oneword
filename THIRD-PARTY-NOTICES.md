# Third-party notices

The OneWord application license does not replace the licenses below. This inventory describes the pinned runtime dependencies in `package-lock.json`; inspect the actual upstream files when updating them. No dependency version changes are made by M4b.

| Runtime component | Version | License / notice in the production build |
| --- | --- | --- |
| React | 19.3.0 | MIT — `licenses/react-LICENSE.txt` |
| React DOM | 19.3.0 | MIT — `licenses/react-dom-LICENSE.txt` |
| Scheduler (React DOM dependency) | 0.28.0 | MIT — `licenses/scheduler-LICENSE.txt` |
| Dexie | 4.4.6 | Apache-2.0 — `licenses/dexie-LICENSE.txt`, `licenses/dexie-NOTICE.txt` |
| ts-fsrs | 5.4.2 | MIT — `licenses/ts-fsrs-LICENSE.txt` |
| PDF.js (`pdfjs-dist`) | 6.3.289 | Apache-2.0 — `pdf-assets/PDFJS-LICENSE` |
| PDF.js Adobe CMaps | Bundled with PDF.js above | Adobe redistribution terms — `pdf-assets/cmaps/LICENSE` |
| PDF.js Foxit standard fonts | Bundled with PDF.js above | PDFium/Foxit BSD-style terms — `pdf-assets/standard_fonts/LICENSE_FOXIT` |
| PDF.js Liberation standard fonts | Bundled with PDF.js above | GPLv2 with font exceptions — `pdf-assets/standard_fonts/LICENSE_LIBERATION` |

The Liberation notice in this pinned package is **not** the SIL Open Font License. Read its actual GPL and exception text, including font/source redistribution requirements, before redistributing those assets; embedding a font in a document does not by itself apply that license to the document. A public distributor must arrange any required corresponding font source alongside the release source materials. M4b retains the existing unmodified font files and notices, and does not assert that an unconfigured public source offer already exists.

Build tooling copies the selected runtime license texts and Dexie NOTICE verbatim from installed packages. It retains the existing complete PDF.js resource notices. `npm run verify:release` compares the shipped bytes to their source files and checks their inclusion in the service-worker asset list. There is no whole `node_modules` license tree in `dist/`.

OneWord's own `LICENSE` and `COPYRIGHT` are copied to `licenses/ONEWORD-AGPL-3.0.txt` and `licenses/ONEWORD-COPYRIGHT.txt`; this inventory is `licenses/THIRD-PARTY-NOTICES.txt`. Serve the entire output and preserve these notices. Do not relicense dependencies when modifying the app.

Development tools are not shipped as a dependency tree in the web app. Principal tools include Vite 8.3.0 (MIT), Vitest 5.0.1 (MIT), TypeScript 5.9.3 (Apache-2.0), Playwright 1.63.0 (Apache-2.0), ESLint 10.10.0 (MIT), and fake-indexeddb 6.2.5 (Apache-2.0). Their complete license/notice files remain in their installed packages; the lockfile identifies transitive packages. This runtime inventory is not a legal audit of every toolchain dependency or imported user document.

The Code of Conduct is adapted from the canonical [Contributor Covenant 2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/), with its attribution retained. PDFs, images, text and Study Packs supplied by users remain subject to their own rights and licenses; OneWord claims no ownership of them.
