# RC0 blocker closure

Follow-up: the subsequent milestone gate found a cold-install readiness failure.
[RC0-OFFLINE-READINESS.md](RC0-OFFLINE-READINESS.md) records its investigation and
current verification. The results below describe the earlier closure run.

Started from clean `main`, commit `cee7175`, with public release blocked.
This task is technical closure only: no commit, push, tag, release or deployment.
Proposed application version remains 0.1.0.

## Toolbar investigation and correction

The RC0 full suite recorded 80/81. The failed opacity assertion alone could not
identify its cause; the old error context also showed a resume control. The old
headed spec disabled trace/screenshots, so the precise input that paused that
original run cannot be reconstructed retrospectively.

A read-only event observer on the original sequence recorded focus, fullscreen,
keyboard/pointer events, playing state, opacity, hover and reduced-motion state.
One initial diagnostic passed; a bounded three-sample diagnostic then produced
two passes and one same-assertion failure. These are investigation samples, not
substitutes for the final gate. In the failed sample:

- Space targeted the focused fullscreen stage; the Reader changed to playing.
- The test's final pointer move was at 4409.8 ms. Further **trusted pointer moves**
  arrived at 5680.3, 6025.8, 8561.5 ms and later while the test issued no pointer
  action. The shared WSLg desktop can deliver native input to a headed window.
- The 6025.8 ms event reset the timer; `controls-visible` was removed at 8428.8 ms,
  about 2403 ms later. Opacity started fading, then another pointer event revealed
  controls again. Hover and focus-within on the toolbar were false; reduced motion
  was false. No fullscreen exit or paused state explained this reproduced failure.

Classification: **C/F, a shared-desktop pointer/input race in an inactivity test**.
The observed timer behavior is correct. The exact historical paused-state event
remains unknown; it is not represented as a separately proven runtime regression.

No Reader runtime or CSS was changed. `revealControls` resets one 2400 ms timeout;
unmount cancels it. Paused/completed states keep controls visible, and toolbar
`:focus-within` keeps them visible after the timer. Pointer movement/down and
handled keys reveal/reset controls. Reduced motion removes the fade transition,
not the inactivity delay. Blur/hidden/pagehide intentionally pause playback.

The headed case retains real fullscreen entry, keyboard access and Escape/exit.
Two additional headless cases isolate absence of desktop input while retaining
real fullscreen, timers and production CSS: normal and reduced-motion modes.
They check initial visibility, timer reset by a second movement, auto-hide with
no toolbar hover/focus, continued playback, focus retaining visible controls
beyond 2400 ms, hiding again after focus leaves, and Escape. The original 5000 ms
fade assertion timeout is unchanged. No retry, skip, forced opacity, mocked
fullscreen or input-event suppression was added.

One additional PDF case proves that text extraction itself requests the local
Liberation font, independently of SW precache. The full primary total is
84 (81 previous cases plus two toolbar cases and one font case).

## Production CSP

Origin of the defect: a static HTML meta policy in index.html, not server/test
configuration or generated HMR. Before: `connect-src 'self' ws://127.0.0.1:*`.
After: `connect-src 'self'`. Vite's existing serve-only plugin still handles the
development policy separately. `verify:csp` and `verify:release` inspect built
HTML, require one CSP and an explicit self-only connect-src, and reject explicit
WebSocket scheme/origin allowances. Validator tests cover localhost, IPv4, IPv6,
alternate IPv4, wildcard/scheme allowances and missing/duplicate policy bypasses.

## Notice and font review

Vite/Rolldown emitted helpers are inventoried in
[THIRD-PARTY-RUNTIME.md](THIRD-PARTY-RUNTIME.md). Three scoped notice assets were
added; the selected verifier total is 16. No development dependency tree is copied.

Liberation is technically needed/shipped and remains unchanged. The versioned
source and binary archives were inspected; their font bytes/glyph counts differ
from PDF.js's assets despite matching version strings. Preserve notices and seek
upstream/qualified review of the exact source relationship. See
[LIBERATION-SOURCE.md](LIBERATION-SOURCE.md). Compliance is **NEEDS EXTERNAL REVIEW**.

## Release identity and validator

The user supplied `https://github.com/usingbot/oneword.git`; the central canonical
web URL is recorded in [release-metadata.json](../release-metadata.json). A read-only
check found that public repository empty; no source was pushed. Security and
conduct routes remain null/unverified. The policies link to this record instead
of invented addresses. [RELEASE-METADATA.md](RELEASE-METADATA.md) lists exact fields,
private GitHub reporting setup and the distinction between selected repository
and accessible exact corresponding source.

`release:check` is separate from normal build/dev. It checks artifacts and refuses
missing contacts, public-issue routes, unresolved source identity and notice/font
review. Its local flags are attestations, not proof of live/private infrastructure.
Its blocked result must remain visible until real remaining work is complete.

## Verification and classification

Windows Node 22.17.0/npm 11.15.0 ran the core gate. The documented WSL runner uses
Ubuntu 26.04.1, Node 24.21.0/npm 11.19.0, Playwright 1.63.0 and the existing local
Chromium/Firefox binaries. No dependency version or lockfile was changed.

| Command/check | Closure result |
| --- | --- |
| `npm run typecheck` / `npm run lint` | PASS |
| `npm test` | PASS: 180/180 application unit/integration tests (13 files), plus 12/12 release-validation tests; no skips |
| `npm run build` | PASS; main JS 395.27 kB, gzip 125.68 kB; unchanged application chunk hash |
| `npm audit` | 0 vulnerabilities reported |
| `npm run verify:release` | PASS: 16 exact notice assets, package/lock versions, SW integrity entries and built CSP |
| `npm run verify:csp` | PASS against actual dist/index.html; self-only connect-src |
| Focused browser verification | PASS: 4/4, 35.0 seconds; diagnostic observations are excluded from this count |
| Full documented WSL primary suite | PASS: 84/84 in 12.4 minutes, including native visibility; 0 skip/retry/xfail |
| Documented Firefox smoke | PASS: 1/1 in 28.6 seconds, 0 skip/retry; cold offline shell, PDF, Reader, FSRS and Quiz |
| `npm run release:check` | BLOCKED, exit 1: six missing/unverified owner/source declarations and one font-source review blocker |
| Clean lockfile verification | PASS: npm ci, typecheck, lint, 180+12 tests, build, notice/CSP checks and audit 0; readiness still correctly BLOCKED |
| Final whitespace/scope review | PASS: both Git diff checks; 25 intentional changed/new files, no staged files, no excluded paths; local documentation links resolve |

The clean check used an explicit 137-file source snapshot: tracked source plus
the ten intentional new files, without node_modules, dist, local browser tools,
profiles, caches or ignored diagnostic/download evidence. It installed from the
unchanged lockfile in `.tools/rc0-closure-clean`. All executable/test inputs were
identical to the working tree; the final report is completed after verification.
No claim is made that the not-yet-committed files already exist in a Git archive.

The complete browser commands were run after rebuilding both update fixtures:

```sh
npm run test:prepare-updates
wsl -d Ubuntu -- bash /mnt/d/oneword/scripts/test-wsl.sh
wsl -d Ubuntu -- bash /mnt/d/oneword/scripts/test-wsl.sh --config=playwright.firefox.config.ts
```

| Blocker | Classification | Remaining action |
| --- | --- | --- |
| Toolbar/browser assertion | TECHNICALLY CLOSED | Full gate passes with input-isolated inactivity assertions and headed focus/Escape coverage; historical pause input remains unproven. |
| Production loopback CSP | TECHNICALLY CLOSED | Built output and regression guard pass. |
| Vite/Rolldown emitted-runtime notices | TECHNICALLY CLOSED | Scoped notices, inventory and exact artifact checks complete. |
| Liberation technical inventory | TECHNICALLY CLOSED | Local PDF extraction request, shipped bytes and license retention verified. |
| Liberation source/distribution compliance | NEEDS EXTERNAL/LEGAL REVIEW | Resolve exact preferred-source/build relationship and review accessible source arrangement. |
| Private security route | WAITING FOR USER INPUT | Supply/configure a real route and verify private receipt. |
| Private conduct enforcement route | WAITING FOR USER INPUT | Supply/configure a separate appropriate route and verify private receipt. |
| Canonical repository selection | TECHNICALLY CLOSED | Owner-provided URL recorded; no remote or repository settings changed. |
| Accessible exact application source | WAITING FOR USER INPUT | Later authorize/freeze/publish the actual source and verify its full-commit URL. The empty repository does not satisfy this. |

RC technical status: **READY FOR FINAL USER METADATA**. This label means the
technical gates have closed; it does **not** waive the external font-source review.
Public release remains **NOT READY**. Release metadata rejection is an expected
safeguard, not a passing release gate. No commit, push, tag, release or deployment
was performed; HEAD remains `cee7175` on `main`.

Scope review found no changes under `src/` or to package-lock.json. New files are
intentional source/tests/docs/metadata. Generated profiles, downloads, build output
and diagnostic artifacts remain ignored. A limited credential-pattern scan found
no matches; no environment/secret files were read and this is not a guarantee of
secret absence. Browser coverage is Chromium/WSLg plus the documented Firefox
smoke, not a full Firefox suite, hosted CI, Safari/real-device or deployed-origin
verification. The clean snapshot reran the core install/build/test checks; browser
gates ran against the working-tree production build with the same executable inputs.

## Local evidence

Generated diagnostic/download artifacts are ignored and are not release payload.
No personal documents were used. Checked-in scripts/tests reproduce the technical
checks; these local files retain detailed observations from this workstation:

- `artifacts/rc0-toolbar-diagnostic-run.log`, `rc0-toolbar-samples.log`,
  `rc0-toolbar-sample-2.json` and PNG: original-sequence observations, including failure.
- `artifacts/rc0-font-archives.json`, `rc0-font-metadata.json`: archive hashes,
  font byte comparisons, name-table versions and glyph counts.
- `artifacts/rc0-closure-typecheck.log`, `rc0-closure-lint.log`,
  `rc0-closure-test.log`, `rc0-closure-build.log`, `rc0-closure-audit.log`.
- `artifacts/rc0-closure-browser.log`, `rc0-closure-firefox.log`,
  `rc0-closure-focused-browser.log`, `rc0-closure-update-fixtures.log`.
- `artifacts/rc0-closure-notices.log`, `rc0-closure-csp.log`,
  `rc0-closure-readiness.log`, `rc0-closure-clean-build.log`.
- `artifacts/rc0-closure-source-manifest.json`, `rc0-closure-review.json`:
  exact clean-snapshot input hashes and final scope/font/link review.
- `artifacts/rc0-toolbar-{no-preference,reduce}.json` and corresponding
  `rc0-toolbar-{hidden,focused}-{no-preference,reduce}.png`: final full-suite
  auto-hide/focus evidence. The normal-motion hidden/focused screenshots were
  inspected visually and agree with the DOM assertions.

The first diagnostic launch had an incorrect temporary config web-server cwd and
did not start a browser. The config was corrected before collecting samples;
that launch is not counted as a passing check.
