# RC0 hardening keyboard review closure

Started on `main`, HEAD `cee7175`, with 38 unstaged/untracked RC0 files and an
empty index. Earlier compatibility work is preserved. No runtime/dependency/
lockfile edits, staging, commit, publication or Liberation investigation belong
to this follow-up.

## Finding and contract

Classification: **K — D/B/J combination: input before initial review readiness,
correctly ignored by the reveal guard, exposed by asynchronous read timing**.
The test treated mounting the review region as proof that its card had loaded.
Those are different states. `ReviewPanel` first renders the region with no
snapshot/card, starts `gateway.read()`, then receives the card and focuses the
region. Space is accepted only when a card exists; numeric ratings require reveal.

The historical trace shows `Đang đọc lịch ôn trên thiết bị…` after entry at
126848.338 ms; focus starts at 126865.476 ms. After Space, the rating-control query
returns **0** at 127079.472 ms. The old `for (... await locator.all())` therefore
checked no buttons. The screenshot/key-3 sequence then operated on recall rather
than a revealed answer. The status assertion failed after 5068.187 ms. The visible
success status was not a wrong oracle; no successful rating had occurred.

Historical DOM snapshots use incremental references, so absence of repeated text
in an individual serialized snapshot is not proof it disappeared. The historical
trace did not capture handler-local variables. The following controlled probe
establishes the mechanism; it is not passed off as instrumentation retroactively
present in that failed run.

## Input and transaction evidence

An unchanged-action copy of the exact hardening test ran alone in a fresh process/
context with diagnostics: **1/1 PASS, 20.4 s** (32.5 s runner). This is one
controlled measurement, not a retry policy or proof the old race was resolved.

Test-only diagnostics in ignored `artifacts/` use DOM capture/bubble listeners for
keydown/keyup, real IDB transaction/put observers, and non-pausing CDP conditional
breakpoints in the unchanged production review handler/rate/execute functions.
They record key/code/repeat, target tag/role/editability, defaultPrevented, active
element, card/reveal/busy state, schedule revision, operation ID, open dialogs and
inert ancestry. CDP probes match this specific built bundle, are diagnostic only,
and are not a production API or part of the permanent regression. No production
logging or fake UI/success state is introduced.

The first diagnostic's `mainInert` field refers to the first (Reader) main, which
is intentionally inactive while Study is open. The controlled probe scopes this
to the review's actual main (`reviewMainInert=false`); target inert ancestry and
body inert are false. It is not evidence of an overlay blocking review input.

A real held IndexedDB transaction deterministically prevents the initial review
read from completing. Space and `3` reach both the page and the actual handler,
with active/target `SECTION[aria-label="Ôn theo lịch"]`, repeat=false, no editable
target, no inert ancestor or dialog. Handler state is snapshotReady=false,
cardId=null, revealed=false, busy=false. Neither rate nor execute is invoked.
There is no corresponding review write/commit/abort to await. After releasing the
hold, card `card-0-0`, content revision 1 and schedule revision 1 become available;
`3` before reveal remains ignored. This is not a stale/duplicate command rejection.

After observable readiness and keyboard reveal, `3` reaches rate with Good and
execute with the current operation ID/content/schedule revisions. Both button
and keyboard paths commit exactly one real ReviewEvent, advance schedule revision
1 → 2 and record generation 3 → 4, show success and move to card `card-0-1`.
The two setups are byte-equivalent in the captured JSON and use the same fixed
clock; their resulting scheduler state is identical. Event/operation UUIDs are
properly independent. Controlled diagnostic comparison: **2/2 PASS**, button
6.4 s, keyboard 6.6 s (18.5 s runner), with no page errors or aborted transaction.
The unchanged hardening test's later deliberate quota-error branch does abort a
separate document transaction; it is not a review failure.

Repeated native keydown is ignored while a rating write is held and again after
the next card is revealed. Typing `3` into the real review settings input changes
that input, not the review record. Existing stale/idempotency/transaction guards
remain unchanged. No writes are injected to simulate a successful review: fixture
seeding supplies initial state, and holds issue reads only until released.

## Small correction and accessibility

`tests/hardening.spec.ts` now waits for the actual first card and enabled reveal
button before focusing the review region and sending Space. It then verifies the
answer, exactly four rating controls and enabled Good before sending `3`.
The four-button count prevents vacuous touch-target coverage. All original
keyboard/touch/layout/modal/quota checks remain, including the 5000 ms visible
success assertion. `tests/fixtures/review.ts` additionally checks persisted event,
revision, generation and unchanged unrelated review data. No timeout increases,
arbitrary sleeps, retries, skips or xfails are used.

`tests/review-keyboard.spec.ts` adds two browser cases: identical button/keyboard
control states, delayed initial read, suppression before reveal, keyboard-only
focus → Space → Good, exact-once commit, native repeat, next-state success and
real form input suppression. Holding a transaction supplies a deterministic
precondition, not a timing guess. The keyboard path does not require a mouse
between focusing the card region, revealing and rating.

The existing exclusion of buttons/links is retained: focused controls keep their
native activation behavior, while review shortcuts operate on the review region.
There is no evidence the button exclusion caused this failure. The success
message is set after the gateway transaction resolves and has no auto-dismiss
timer; it remains useful user-facing coverage alongside authoritative storage.

## Isolation and gates

Service-worker/startup hardening did not change the review handler or its initial
read contract. No worker wait or update causes the reproduced failure; a held
database read reproduces it in a fresh context. The controlled order experiment
passed 8/8: five offline cases, hardening, compatibility, then hardening again.
It uses one server/build with fresh project workers/contexts; it does not claim
to reuse a context between different tests. The full primary suite additionally
checks the original failed order in its normal project/worker. No prior-state
dependency was observed. The formerly failing case passed at position 13 of
the normal full run (17.4 s), and both new cases passed at positions 64/65
(11.1 s / 14.6 s). The complete primary suite finished **91/91 PASS, 22.6 min,
exit 0**. Firefox smoke finished **1/1 PASS, 9.4 s** (42.7 s runner).

| Check | Result |
| --- | --- |
| Relevant unit/integration | PASS 26/26, two files, 6.96 s |
| Corrected exact hardening test + two regressions | PASS 3/3, 1.6 min; hardening 30.0 s, button 20.3 s, keyboard 22.2 s |
| After offline / after compatibility | PASS 8/8, 3.7 min; hardening 27.4 s / 28.6 s |
| Typecheck / lint / build / audit | PASS; audit 0 vulnerabilities |
| Unit/integration / release validators | PASS 185/185 + 12/12 |
| Chromium/WSL | PASS 91/91, 22.6 min, including native hidden-tab |
| Firefox | PASS 1/1; 9.4 s reported, 42.7 s runner; smoke only |
| Skip / retry / xfail | 0 / 0 / 0 |
| Notices / production CSP | PASS; 16 exact notice assets, explicit self-only production CSP |
| release:check | Expected exit 1: private Security contact, private CoC contact, exact public source mapping/access, Liberation review; no additional blocker |
| Final scope/diff/index review | PASS: 41 files, 36 starting files byte-identical, two reviewed existing edits, three new files; both diff checks clean, index empty |

**The RC0 technical baseline is now verified safe to commit.** Public release
remains blocked by the four release-readiness groups above; the validator was not
weakened. No staging/commit/push/tag/release/deployment was performed. HEAD remains
`cee7175` on `main`. No Liberation provenance investigation was started.

This follow-up changes only `tests/hardening.spec.ts`, adds
`tests/fixtures/review.ts` and `tests/review-keyboard.spec.ts`, and adds this report
plus a three-line follow-up paragraph in the compatibility report. All production
runtime files, dependencies, lockfile, skills and other starting work are preserved.

Relevant commands used for the final gates:

```powershell
npx vitest run src/application/review.test.ts src/storage/review-store.test.ts
wsl -d Ubuntu -- bash /mnt/d/oneword/scripts/test-wsl.sh --project=chromium tests/hardening.spec.ts tests/review-keyboard.spec.ts --grep 'narrow touch and keyboard|same ready review state' --trace=on
wsl -d Ubuntu -- bash /mnt/d/oneword/scripts/test-wsl.sh --config=artifacts/rc0-keyboard-order.config.ts --trace=on
npm run typecheck
npm run lint
npm test
npm run build
npm audit
git diff --check
git diff HEAD --check
npm run verify:release
npm run verify:csp
npm run release:check
npm run test:prepare-updates
wsl -d Ubuntu -- bash /mnt/d/oneword/scripts/test-wsl.sh
wsl -d Ubuntu -- bash /mnt/d/oneword/scripts/test-wsl.sh --config=playwright.firefox.config.ts
```

## Workstation evidence

Only synthetic data is used; logs/traces stay in ignored `artifacts/` and
`test-results/`. Initial diagnostic configuration used the wrong server cwd and
failed before any browser test; `rc0-keyboard-diagnostic-harness-error.log` retains
that harness error separately from application evidence.

- `rc0-keyboard-start-manifest.json`: initial 38-file preservation hashes.
- `rc0-compatibility-hardening-failure-{trace.zip,context.md,analysis.json}` and
  `rc0-keyboard-historical-snapshots.json`: retained historical failure.
- `rc0-keyboard-diagnostic.log`, `rc0-keyboard-controlled.log`,
  `rc0-keyboard-diagnostic-*.json`: handler/input/transaction diagnostics.
- `rc0-keyboard-button.json`, `rc0-keyboard-keyboard.json`: actual before/after
  database comparison for the same seeded review state.
- `rc0-keyboard-focused-unit.log`, `rc0-keyboard-focused-browser.log`,
  `rc0-keyboard-focused-*.zip`: focused gate without diagnostic breakpoints.
- `rc0-keyboard-order.log`: controlled ordering experiment; no retry.
- `rc0-keyboard-{typecheck,lint,test,build,audit,notices,csp,readiness}.log`:
  complete core gate; release-validator tests run as part of `npm test`.
- `rc0-keyboard-update-fixtures.log`, `rc0-keyboard-browser.log`: freshly prepared
  update fixtures and full primary browser gate.
- `rc0-keyboard-firefox.log`: final Firefox smoke.
- `rc0-keyboard-comparison.json`: full-run button/keyboard state equivalence and
  exactly one event/revision increment.
- `rc0-keyboard-review.json`: final preservation/scope review, including a limited
  credential-pattern scan and local Markdown link checks (no environment files read).

Reported browser test durations include teardown and should not be interpreted
as application latency or a new performance guarantee. No fresh dependency
installation is needed or claimed in this task.
