# RC0 offline readiness gate closure

Subsequent baseline verification found a cumulative compatibility-test timeout.
[RC0-COMPATIBILITY-TIMEOUT.md](RC0-COMPATIBILITY-TIMEOUT.md) records that separate
follow-up. The offline findings and verification below describe this earlier run.

Started on `main`, HEAD `cee7175`, with the 25 intentional RC0 blocker-closure
files unstaged. All previous work is preserved. No staging, commit, push, tag,
release, deployment or Liberation provenance investigation is part of this task.

## Cause and evidence

There are two distinct findings:

1. **TEST BUG + ENVIRONMENT LATENCY / cache warm-up race.** The failing image test
   applied the default 5000 ms text-assertion budget to a fresh 213-asset install.
   It did not first establish that the build's precache and controlling worker
   were ready. There is no product promise that installation completes in 5 s.
2. **RUNTIME READINESS BUG / activation-order race, separately discovered.**
   `registration.active` and `navigator.serviceWorker.ready` can describe a worker
   that is still activating. The old client unconditionally set ready from those
   signals. In two of three observed cold runs, the UI showed ready before the
   page had a controller; in all three it preceded completed activation. This
   early signal did not cause the historical preparing timeout.

The original trace's assertion began at 78441.982 ms and failed at 83478.995 ms.
Its last required asset response ended at 83484.511 ms, or **5042.529 ms after the
assertion began**. The four final font responses completed around 5019–5043 ms;
all captured worker responses were HTTP 200. These are timing/transfer observations,
not a new font-source investigation. The install handler awaits every fetch and
cache.put before activation, so the evidence places the failure at completion of
cold precache, not at a known lost UI event. The original run did not record
registration/controller snapshots; its exact worker state is inferred from that
barrier and network timing, not falsely represented as a captured state event.

`seedDatabase` navigates to favicon.svg, seeds synthetic IndexedDB, then the test
loads the app for the first time. Playwright supplies a fresh context per case;
controlled diagnostics confirmed zero registrations and empty CacheStorage before
the app load. No stale worker, old cache or cross-test storage inheritance was found.

The previous `ready` promise is stateful, so there is no evidence that missing
controllerchange alone left the old UI preparing forever. The new tests deliberately
deliver registration after all initial transitions, proving current-state handling
without replaying events. [Service Worker specification: ready](https://w3c.github.io/ServiceWorker/#navigator-service-worker-ready)
and [registration model](https://w3c.github.io/ServiceWorker/#service-worker-registration-concept)
distinguish an active slot from completed activation/control. [Playwright's worker
guidance](https://playwright.dev/docs/service-workers#accessing-service-workers-and-waiting-for-activation)
likewise requires observing activation separately from worker creation.

## Smallest production correction

Only `src/offline/client.ts` changes production behavior in this follow-up.
An idempotent refresh derives ready from both:

- the current registration's active worker is `activated`;
- that same worker is the page's controller.

The controller listener is attached before registration. Registration/worker
listeners cover current installing/waiting/active workers as well as future
transitions; a refresh immediately reads current state after subscribing. The
ready promise triggers refresh rather than assigning true. Disposal removes these
listeners. Failed installations still report failure, and updates retain their
existing user-action, pending-write and multiple-tab protections.

The production worker, cache manifest/integrity rules, fonts, PDF behavior, content,
FSRS/Quiz semantics and stored data are unchanged. The label now accurately waits
for activation/control; it still relies on successful worker installation to have
completed precache. Storage eviction remains outside the guarantee, as documented.

## Test correction and regression coverage

`tests/hardening.spec.ts` now establishes a completed build cache and activated
controller before asserting the label. The label's 5000 ms budget is unchanged.
The test-only `waitForOfflineShell` polls observable state within a 15000 ms
installation failure budget, emits the last state/missing-URL snapshot on failure,
and never creates caches while observing. This bounded margin accommodates the
recorded >5 s cold install; it is not an arbitrary 30 s text timeout or a fixed sleep.

Added coverage:

- Five unit cases in `src/offline/client.test.ts`: registration alone, both
  activation/control orders, already-completed lifecycle, and disposal. Against
  the original client, three failed and two passed; the corrected client passes five.
- Three browser cases in `tests/offline-readiness.spec.ts`, using the test-only
  `offline.ts` and `offline-server.ts` fixtures. A held real asset response proves
  212/213 cached assets with installing worker, no active worker/controller and a
  preparing label. Releasing it yields all 213 assets, activation/control and ready.
  Existing-install reload and a new offline page preserve usable saved Reader text.
  Delayed delivery of native registration tests completion before app observation.

No production readiness is mocked. The server serves unchanged build bytes;
browser transitions are native. Unit event simulation is explicitly separate.
No retries, skips, xfails or timeout increases to the text assertion were added.

## Measurements and verification

Three controlled pre-fix samples each started from empty context state, then
tested existing-install reload and actual offline reload. Every sample is retained;
these observations do not substitute for the regression gate. Times are relative
to navigation, not a device-independent performance guarantee:

| Sample | Register start | Installed | Controller acquired | Activated | UI ready | Existing reload UI ready |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 404.1 ms | 1824.4 ms | 1828.9 ms | 1829.1 ms | 1826.4 ms | 132.5 ms |
| 2 | 247.2 ms | 1483.1 ms | 1484.9 ms | 1485.4 ms | 1485.3 ms | 116.5 ms |
| 3 | 241.9 ms | 1375.4 ms | 1378.5 ms | 1378.8 ms | 1376.7 ms | 110.8 ms |

In the corrected focused held-asset run: register started at 251.9 ms; 212/213
assets and preparing were observed at 2588.5 ms; after release, install completed
at 2623.7 ms, control at 2626.8 ms, activation at 2627.0 ms and UI ready at 2627.9 ms.
The deliberately held response affects this measurement and is not a natural
install benchmark. Existing reload UI ready was 128.9 ms. In the late-registration
case, activation/delivery occurred at 1361.6 ms and ready at 1362.5 ms. Native
offline reloads succeeded with saved text and complete cache.

The full-suite regression run also captured the held-asset path: register started
at 605.4 ms, installed at 4873.5 ms, control at 4877.1 ms, activated at 4877.5 ms,
and UI ready at 4879.7 ms. The ready promise resolved at 4875.9 ms while the worker
was still activating and the controller was null; the corrected UI stayed preparing.
Existing-install reload reached ready at 271.3 ms. The late-registration case
delivered the already-activated registration at 3355.3 ms and reached ready at
3357.1 ms. All three regression cases passed in the full run (9.1/9.3/8.9 s).
The held-asset case confirmed complete cache again after offline reload and no
page/console errors. These timings include test instrumentation/environment load.

Focused browser: **4/4 PASS in 22.9 s**. Case durations: original image flow 5.8 s,
fresh held-asset 4.3 s, existing installation 4.4 s, late registration 4.1 s.
Typecheck/lint/build and the five focused unit cases also passed before the full gate.
Expected totals rise legitimately from 180 to 185 application tests and 84 to 87
primary browser tests; the 12 release-validator tests remain unchanged.

| Full RC0 check | Result |
| --- | --- |
| Typecheck / lint | PASS |
| Unit/integration | PASS 185/185, 14 files; five new lifecycle cases |
| Release-validator tests | PASS 12/12, included in npm test |
| Production build | PASS; main JS 395.61 kB, gzip 125.74 kB |
| npm audit | 0 vulnerabilities |
| Notice validation | PASS, 16 selected assets and SW integrity entries |
| Production CSP | PASS, explicit self-only connect-src |
| Full Chromium/WSL | PASS 87/87 in 15.9 min (86 primary Chromium + 1 native visibility) |
| Firefox smoke | PASS 1/1 in 13.2 s; scenario itself 7.2 s |
| Skip / retry / xfail | 0 / 0 / 0 |
| release:check | Expected BLOCKED exit 1, only private security/CoC channels, exact public application source, and Liberation review |
| Final diff/scope checks | PASS; 33 intentional changed/untracked files, index empty, worker and lockfile unchanged |

The offline blocker is resolved and the RC0 blocker-closure baseline is technically
safe to commit. No staging or commit was performed. Public release is still blocked;
release:check has not been weakened. All 24 other baseline files match their
pre-task hashes; the existing RC0-BLOCKERS report only gained a follow-up reference.
The working tree contains 18 modified tracked files and 15 untracked intentional
files; no generated evidence, caches, dependencies or browser profiles enter that set.
The credential-pattern scan is limited, not a universal secret-absence guarantee.

The complete gate ran `npm run typecheck`, `npm run lint`, `npm test` (including
the 12 release-validator tests), `npm run build`, `npm audit`, both Git diff checks,
`npm run verify:release`, `npm run verify:csp` and `npm run release:check`.
Windows `npm run test:prepare-updates` refreshed the two real update builds before
the documented browser commands:

```sh
wsl -d Ubuntu -- bash /mnt/d/oneword/scripts/test-wsl.sh
wsl -d Ubuntu -- bash /mnt/d/oneword/scripts/test-wsl.sh --config=playwright.firefox.config.ts
```

This follow-up changes one production file (`src/offline/client.ts`), five test
files (`src/offline/client.test.ts`, `tests/hardening.spec.ts`,
`tests/offline-readiness.spec.ts`, `tests/fixtures/offline.ts`,
`tests/fixtures/offline-server.ts`) and three documents (`docs/OFFLINE.md`,
`docs/RC0-BLOCKERS.md`, this report). No other prior RC0 work was rewritten.

## Evidence and limits

- `artifacts/rc0-offline-original-trace.zip`, `rc0-offline-original-error-context.md`,
  `rc0-offline-original-trace-summary.json`: preserved baseline failure.
- `artifacts/rc0-offline-sample-{1,2,3}.json`, `rc0-offline-measurements.log`:
  all pre-fix natural lifecycle measurements, errors and cache/controller snapshots.
- `artifacts/rc0-offline-unit-before.log`, `rc0-offline-unit-after.log`:
  deterministic reproduction and corrected unit result.
- `artifacts/rc0-offline-focused.log` and `rc0-offline-focused-{fresh-install-ready,
  fresh-held-asset,existing-install,late-registration}.json`: preserved focused
  evidence for the timings above. Full-suite evidence uses the same JSON names
  without the extra `focused-` component.
- `artifacts/rc0-offline-{typecheck,lint,test,build,audit,notices,csp,readiness}.log`:
  full core checks and the deliberately blocked release-readiness result.
- `artifacts/rc0-offline-browser.log`, `rc0-offline-firefox.log`: complete browser
  gate results; `rc0-offline-update-fixtures.log` records the prepared update builds.
- `artifacts/rc0-offline-review.json`: final scope, baseline-preservation,
  local-document-link and narrow credential-pattern checks.

The first diagnostic harness attempt misparsed the generated worker's trailing
comment and failed before the application scenarios ran. Its three harness errors
remain in `rc0-offline-diagnostic.log`; they are not counted as product measurements
or passing tests. The parser was corrected before the three controlled samples.
Generated evidence stays ignored; committed test sources make scenarios reproducible.
No hosted CI, deployment, Safari/real-device or permanent-storage claim is made.
