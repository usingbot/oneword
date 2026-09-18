# RC0 compatibility timeout closure

The separate [keyboard review follow-up](RC0-KEYBOARD-REVIEW.md) investigates the
hardening failure found at the end of this run. Results below remain the historical
compatibility-run record.

Baseline: `main`, `cee7175`, with all 33 reviewed RC0 files unstaged. This follow-up
does not change production runtime, dependencies, lockfile, Quiz/FSRS semantics,
or the service worker. No staging, commit, publication or new Liberation provenance
investigation is authorized here.

## Exact original failure

Classification: **environment latency plus a test setup/budget design problem**.
No individual operation waited 30 seconds. The shared test budget expired during:

```ts
await expect(page.getByLabel('Văn bản PDF để chỉnh sửa', { exact: true }))
  .toHaveValue(/OneWord PDF private sample/)
```

The last completed operation before that deadline was `setInputFiles(local.pdf)`.
The original trace places PDF expectation start at 64882.314 ms, the timeout error
before `After Hooks` at 66955.531 ms, and successful expectation completion at
68840.187 ms. The expectation itself took 3957.873 ms, below its own 5000 ms bound.
It was interrupted by the cumulative test budget, not by a false PDF condition.

The async test body continued during teardown: saving the PDF, Reader playback,
FSRS rating and Quiz selection all completed, as did the script/network/error
assertions and final database snapshot. The screenshot was recorded afterwards.
Thus its Quiz view is not the screen at the instant the 30 s budget expired.
There was no Quiz submission wait, essential image, hidden confirmation or stuck
rating transition in this smoke. The in-progress attempt is intentionally seeded
by `libraryFixture`; selecting `First answer` is the final Quiz interaction.

| Original operation | Time |
| --- | ---: |
| Browser launch (worker fixture) | 3370.7 ms |
| Context creation | 100.5 ms |
| Page creation | 4835.8 ms |
| Favicon navigation for seed | 1072.6 ms |
| IndexedDB seed | 844.3 ms |
| App navigation | 2500.8 ms |
| Offline-ready label expectation | 15543.5 ms |
| Switch offline | 15.2 ms |
| Offline reload | 1140.3 ms |
| Saved Reader value expectation | 370.6 ms |
| PDF file input | 293.6 ms |
| PDF text expectation | 3957.9 ms; test deadline occurred inside this await |
| After-hooks/teardown | 24547.1 ms |

The browser worker fixture has its own timeout; page/context setup and the body
shared the test budget. [Playwright timeouts](https://playwright.dev/docs/test-timeouts)
document that distinction. The reported 54.4 s failure duration includes teardown;
it does not mean an application operation blocked for 54.4 s. Every awaited call
and its timestamp is retained in the original trace/timeline evidence.

## Controlled diagnosis and browser state

One instrumented, unchanged-budget run of compatibility alone passed: 28.5 s
reported, 44.4 s runner total. Its major body phases were seed 1.303 s, navigation
plus cold readiness 7.416 s, offline reload 0.931 s, PDF 3.073 s, Reader 0.401 s,
FSRS 1.918 s, Quiz 0.881 s, final privacy/database checks 0.226 s. Teardown was
11.049 s. The reported duration therefore must not be treated as body-only time.
This controlled measurement complements the retained failure, rather than retrying
until a pass and discarding failures.

Test-only diagnostics record current URL/document.readyState, headings, dialogs,
focus, progress indicators, checked choices, DB names/version, cache manifest,
controller/installing/waiting/active workers, lifecycle, navigation history,
console/page errors, pending requests, local/session storage keys and permission
state. Only synthetic fixtures are used. `indexedDB.databases()` and the final
successful database snapshot do not claim visibility into every internal DB lock.
The historical trace did not record all those live snapshots at its deadline;
later diagnostic state is explicitly not substituted for the historical state.

Focused corrected state: document complete, activated controller, complete cache,
no waiting worker, pending requests, page/console errors or modal. The only
progressbar is the Reader's normal progress indicator, not a loading spinner.
Geolocation permission remains `prompt`. Navigation history consists only of seed
favicon visits, app load and the explicit offline reload; no update reload occurs.

Service-worker installation contributed cold-start latency, but its ready wait
completed before the failed PDF assertion. No lost worker event, stale cache or
update interaction was found. The failure was already the first test of a fresh
process, so it did not require residue from a predecessor. Every corrected smoke
asserts zero registrations, empty caches, no DB and empty local/session storage
before seeding. It preserves that same context through installation and the
offline user flow, rather than clearing storage immediately before an assertion.

## Correction and regression

`tests/fixtures/compatibility.ts` provides a test-scoped cold-install fixture with
its own 30000 ms provisioning budget. It creates the page, verifies empty origin
state, seeds the same synthetic library and waits for the real complete build
cache plus an activated controlling worker, then checks the visible ready label.
The earlier smoke already allowed 30000 ms for that label alone; now all setup
must fit the fixture bound. [Playwright fixture timeouts](https://playwright.dev/docs/test-fixtures#fixture-timeout)
support this explicit separation of setup from test behavior.

The test body retains its default 30000 ms budget. Every original product
assertion remains in the same context and integration path: cold offline reload,
real PDF ingestion, saved Reader text/playback, FSRS recall/reveal/rating, Quiz
keyboard selection, no PDF script execution, same-origin GET-only traffic,
absence of page errors and final persisted database evidence. Named steps make
future failures attributable. No global timeout, retry, skip or xfail is added.
The total wall time can exceed 30 s because provisioning and behavior now have
separate bounds; this is explicit budget separation, not a claim of unchanged
end-to-end duration or a new product performance guarantee.

The additional `tests/offline-compatibility-budget.spec.ts` holds one real precache
response for 6000 ms while the eventual user-flow budget is only 5000 ms. The
fixture still verifies all assets and native activation/control. It asserts
setup exceeded that body budget, then actually reloads offline and reads saved
content. Removing the fixture's independent timeout charges that setup to the
body budget and prevents completion. The timer is intentional latency injection;
it never declares readiness or replaces the lifecycle/cache oracle.

A controlled counterfactual copied this fixture/spec into ignored `artifacts`
and removed only the independent fixture timeout. It failed with **Test timeout
of 5000ms exceeded**, as intended, while the unchanged corrected regression had
already passed. This diagnostic failure is not counted as a passing product test
or an xfail. Its first harness attempt accidentally retained an array wrapper
instead of a callable fixture and failed before provisioning; that separate
harness-error log is preserved, not presented as root-cause evidence.

Focused corrected gate: **2/2 PASS**, smoke 21.8 s and budget regression 9.0 s,
runner total 1.2 min. Recorded fixture setup was 12.170 s for smoke and 9.758 s for
the held-asset regression; regression body plus final state capture took 0.961 s.
These are machine-local observations, not product speed guarantees.
Playwright's reported per-test duration does not include all independently timed
fixture work. The first full-suite smoke ran first and passed with 3.4 s reported;
its recorded provisioning was 3.565 s and the subsequent body plus state capture
was 2.562 s. Raw setup/body/teardown timings, rather than the displayed duration
alone, are the basis of this diagnosis.

## Additional full-gate startup finding

The first full run after the compatibility fix finished **87 passed, 1 failed**
in 16.3 min. Compatibility passed first, including the new budget regression.
The failure was `tests/reader.spec.ts:28`: after setting a TXT file, the chunk
remained the empty placeholder instead of `Một` for the 5000 ms assertion budget.
This failure is retained, not replaced by a passing rerun of unchanged code.

The trace shows `<main id="main" inert>` immediately after navigation at
510198.020 ms and still during `setInputFiles` at 510400.603 ms. By its completion
at 510538.534 ms, initialization had removed inert, but no imported text survived.
The application deliberately makes main inert while loading IndexedDB. The
programmatic file-input API bypassed that real-user interaction boundary; this
test submitted a file before startup finished. No corresponding runtime change
is needed for the supported interactive flow.
[Playwright's actionability table](https://playwright.dev/docs/actionability)
confirms `setInputFiles` does not perform the visibility/enabled/receives-events
checks used by interactive clicks.

`tests/reader.spec.ts` now checks the actual main `inert` property is false before
the first TXT import. The chunk assertion, file-error/empty-file checks and their
timeouts are unchanged. The original trace and error context are preserved in
`rc0-compatibility-reader-failure-trace.zip` and `rc0-compatibility-reader-failure-context.md`.
The first full log is `rc0-compatibility-browser-before-reader-gate.log`.
This is a second test-methodology correction discovered by the required full gate,
not a Quiz/FSRS or service-worker runtime repair.

## Firefox cold PDF assertion boundary

After the Reader correction, the full Chromium suite passed **88/88 in 15.8 min**.
The subsequent Firefox smoke failed its PDF preview assertion's **5000 ms** bound,
not the test's 30000 ms budget. Provisioning took 21.949 s in its separate fixture;
offline reload/content recovery took 2.247 s. File input completed at 51466.184 ms,
and the preview assertion ran from 51469.187 to 56670.273 ms (5201.086 ms).
The failure snapshot shows the PDF dialog still checking the file. By final
diagnostics at approximately 58934 ms, extraction had completed (page-one result,
no extraction progressbar). Console/page errors and pending requests were empty.
The activated controller, complete cache and absence of waiting workers persisted.
This is evidence of cold asynchronous PDF startup exceeding the default assertion
window, not evidence of a stuck import or a Quiz transition failure.

The smoke now calls `waitForPdfPreview` before the unchanged text assertion. Its
locator visibility wait uses the existing remaining 30 s test deadline; no test
or global timeout is increased. This deliberately allows async PDF completion
more than the old 5 s assertion window, while the entire user flow remains bounded
by the same test deadline. It does not promise that all supported PDFs finish in
5 s (production extraction already has a separate 120 s guard).

A second deterministic regression delays delivery of the real production PDF
module by 6 s, asserts the visible processing state, waits through the same helper,
and verifies actual extracted text. It asserts measured delay exceeds 5 s.
Service workers are disabled only for this network-latency injection test so the
route intercepts module delivery; the integration smoke still verifies real
offline caching/control and PDF extraction. No module response, worker result or
UI state is fabricated. Primary coverage is now 89 tests, including both new
regressions. The failed Firefox trace/context/state/log are preserved.

## Remaining full-gate blocker — stopped

The final 89-case Chromium run passed compatibility first (11.4 s), then failed
`tests/hardening.spec.ts:82` in the narrow touch/keyboard/reduced-motion test.
The last completed action was `page.keyboard.press('3')`. The exact failed await
was `expect(review.getByRole('status')).toContainText('Đã lưu đánh giá')`, which
spent 5068.187 ms against its default 5000 ms assertion budget. The snapshot still
shows the review recall phase and `Mở đáp án`; no review status is present.
Reported test duration was 36.0 s, including 21.169 s after-hooks/teardown.
This is not the original compatibility shared-budget timeout.

The run was interrupted after observing this failure; by termination the log
contained **14 passed, 1 failed**, with 74 planned cases lacking a final result.
No retry/skip/xfail was configured or added. The failed hardening trace/context are
retained and no test runner/server remained after interruption. Its root cause
has not been established; no hardening or FSRS runtime edit was made in response.
The earlier 88/88 run does not substitute for a passing final gate after the PDF
wait correction. **RC0 is not yet verified safe to commit.**

## Verification

| Check | Result |
| --- | --- |
| Instrumented original smoke alone, fresh process | PASS 1/1; diagnosis only |
| Corrected smoke plus deterministic budget regression | PASS 2/2 |
| Final smoke plus both deterministic regressions | PASS 3/3 in 1.5 min; smoke 26.1 s, setup-budget case 13.1 s, PDF-delay case 10.4 s |
| After hardening/offline suite | PASS 18/18 in 3.4 min; smoke last 17.9 s, fresh process/context, same server/build |
| Focused Reader plus compatibility after startup-boundary correction | PASS 12/12 in 1.8 min; TXT case 4.8 s, smoke 4.5 s |
| Typecheck / lint | PASS |
| Unit/integration / release validators | PASS 185/185 + 12/12 |
| Build / audit / notices / CSP | PASS; audit 0, 16 notice assets, self-only production CSP |
| Full Chromium/WSL, smoke first | Final FAILED/stopped: 14 pass, 1 fail, 74 without final result; hardening review-status assertion at line 82 |
| Firefox smoke | Final PASS 1/1; 11.9 s reported, 47.6 s runner; earlier 5 s assertion failure retained above |
| release:check | Expected BLOCKED exit 1; only security/CoC configuration/verification, exact public source mapping/access, Liberation review |
| Final scope/diff checks | PASS at review; 38 changed/untracked files, index empty, no runtime changes in this task |

Compatibility focused coverage and Firefox pass, but the full RC0 baseline remains
blocked by the final hardening failure. No staging or commit was performed.
Of the 33 starting files, 32 remain byte-identical; the existing offline report
only gained a four-line follow-up link. This task changes four test files and two
documentation files. No dependency/lockfile or production runtime changes were
introduced, and ignored evidence/build/browser outputs are not in the index.

## Evidence

Ignored workstation evidence is under `artifacts/`:

- `rc0-compatibility-original-trace.zip`, `rc0-compatibility-original-error-context.md`,
  `rc0-compatibility-original-timeline.json`: retained failure and every awaited call.
- `rc0-compatibility-diagnostic.log`, `rc0-compatibility-diagnostic-trace.zip`,
  `rc0-compatibility-diagnostic-state.json`, `rc0-compatibility-diagnostic-timeline.json`:
  the single controlled measurement before the budget correction.
- `rc0-compatibility-focused.log`, `rc0-compatibility-focused-trace.zip`,
  `focused-rc0-compatibility-chromium-*.json`: corrected smoke/regression.
- `rc0-compatibility-order.log`: hardening/offline predecessor suite followed by
  compatibility in a new worker/process against the same unchanged server/build.
- `rc0-compatibility-shared-budget.log`, `rc0-compatibility-shared-budget-trace.zip`:
  counterfactual timeout reproduction; `rc0-compatibility-shared-budget-harness-error.log`
  retains the earlier harness construction error separately.
- `rc0-compatibility-browser-before-reader-gate.log`,
  `rc0-compatibility-reader-failure-trace.zip`, `rc0-compatibility-reader-focused.log`:
  TXT startup-boundary failure and focused correction.
- `rc0-compatibility-browser-before-preview-wait.log`: 88/88 Chromium before the
  Firefox-discovered assertion boundary correction.
- `rc0-compatibility-firefox-before-preview-wait.log`,
  `rc0-compatibility-firefox-failure-trace.zip`,
  `rc0-compatibility-firefox-failure-context.md`, `failed-rc0-compatibility-firefox-*.json`:
  retained Firefox failure and teardown state.
- `rc0-compatibility-preview-focused.log`, `rc0-compatibility-preview-focused-trace.zip`,
  `rc0-compatibility-preview-regression-trace.zip`: final 3/3 focused gate.
- `rc0-compatibility-{typecheck,lint,test,build,audit,notices,csp,readiness}.log`:
  final core gate, including the expected release-readiness exit 1.
- `rc0-compatibility-firefox.log`: final Firefox 1/1 smoke.
- `rc0-compatibility-browser.log`, `rc0-compatibility-hardening-failure-trace.zip`,
  `rc0-compatibility-hardening-failure-context.md`,
  `rc0-compatibility-hardening-failure-analysis.json`: final interrupted gate and
  unresolved hardening failure, not a passing full-suite result.
- `rc0-compatibility-review.json`: preservation/scope review; no environment files
  read, no excluded paths or matches in a limited credential-pattern scan.

The two new regressions raise primary browser coverage from 87 to 89. Firefox keeps
the complete one-test smoke; it is not a claim of full Firefox suite coverage.
