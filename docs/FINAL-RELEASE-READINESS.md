# Final release metadata and readiness — 2026-09-19

Historical metadata-preparation result, before source publication. See
[PUBLIC-SOURCE.md](PUBLIC-SOURCE.md) for the subsequent source-only publication
and dynamic source-access checks. The following records the earlier gate result.

Classification: **NOT READY** under the then-current publication validator.
Metadata preparation is complete; this is not publication approval.

## Scope and identity

Started from clean main at e52ad5c716e844b29e1b25341db2f1af3ef47984.
Only documentation, package metadata and release-metadata.json changed.
No runtime, browser tests, build logic, dependency versions, lockfile, manifest,
service worker or validator was changed. No archives were downloaded or added.

Security fallback and Code of Conduct enforcement both use
[andmx3456@gmail.com](mailto:andmx3456@gmail.com). The owner explicitly confirmed
receipt testing and monitoring for both channels in this task. Both are configured
and verified by owner attestation; the agent sent no mail and inspected no inbox.
GitHub Private Vulnerability Reporting is not claimed enabled. After publication,
enable/verify it and prefer it if available, retaining email as fallback.

Canonical source repository: https://github.com/usingbot/oneword.
package.json repository/homepage/bugs fields match this destination; public issues
are for ordinary bugs, never sensitive vulnerability or conduct reports.

Candidate version is **0.1.0**, with package.json as authority. Lockfile, release
metadata, README, CHANGELOG, VERSIONING and checklist agree. Planned tag v0.1.0
does not exist as a result of this task. Manifest identity has no independent
release-version field; SW identity is the existing content hash and the default
HTML build label remains production. No version/cache behavior was changed.

Source/build mapping is **PREPARED**, as documented in
[RELEASE-METADATA.md](RELEASE-METADATA.md). Final commit/URL and anonymous access
are still pending. A prior baseline is not labeled as the final release source,
and no nonexistent tag/release link or verified public source offer is advertised.

## Liberation

**LIKELY CLOSED — NEEDS LEGAL REVIEW** remains unchanged. No legal compliance or
maintainer risk acceptance is asserted. The validator continues to require legal
review and an accessible approved source arrangement.

After separate legal/source-delivery and publication approval, preserve and provide:

- fonts-liberation_1.07.4-11.dsc
- fonts-liberation_1.07.4.orig.tar.gz
- fonts-liberation_1.07.4-11.debian.tar.xz

Use the exact authoritative URLs, lengths and SHA-256 values already recorded in
[LIBERATION-SOURCE.md](LIBERATION-SOURCE.md). Provide all three alongside the
release artifacts, with checksums/source directions; arrange appropriate source
access for hosted font distribution. The original archive alone omits the patches.
This plan is not a finding of legal sufficiency; no source bundle is put in Git.

## Checks executed

| Check | Result |
| --- | --- |
| npm run typecheck | PASS |
| npm run lint | PASS |
| npm test | PASS: 185/185 unit/integration, 14 files; 12/12 release-validator tests |
| npm run build | PASS |
| npm audit | 0 vulnerabilities |
| npm run verify:release | PASS: 16 exact notice assets, package metadata and SW integrity |
| npm run verify:csp | PASS: self-only production connect-src |
| git diff --check / git diff HEAD --check | PASS |
| Metadata/version consistency assertions | PASS: package/lock/docs/release version, URLs, contacts, pending source/legal fields |
| Production output comparison | All 214 file paths and SHA-256 hashes unchanged from the pre-task dist |
| npm run release:check | BLOCKED, exit 1; exact messages below |

The full browser suite was not rerun, as requested. Reused accepted technical
baseline: **91/91 Chromium/WSL, 1/1 Firefox smoke, 0 skip/retry/xfail**, from
[RC0-KEYBOARD-REVIEW.md](RC0-KEYBOARD-REVIEW.md). No runtime/browser changes occurred;
the full dist comparison supports reuse. This is not a new browser execution.

Exact remaining release:check messages:

1. WAITING FOR USER INPUT: Record the exact release source URL containing its full source commit, not only a moving repository branch.
2. WAITING FOR USER INPUT: Verify public access to the exact corresponding application source.
3. NEEDS EXTERNAL/LEGAL REVIEW: Liberation source-distribution review/accessible source arrangement is unresolved.

Thus the result cannot truthfully be classified BLOCKED ONLY BY LIBERATION LEGAL
APPROVAL. The existing policy requires source identity/access as well. Those flags
were not fabricated and validation was not weakened. Technical gates passed;
publication readiness did not. The existing checklist still requires separately
authorized publication, hosted CI and any deployed-origin verification.

## Placeholder and path audit

Searched tracked files for TODO, FIXME, CHANGEME, example.com, your-email, yourname,
SECURITY_CONTACT, CODE_OF_CONDUCT_CONTACT, REPO_URL and placeholder.
No fake release-facing metadata remains. Remaining matches are:

- Historical M4b decisions/report entries, explicitly superseded by current RC0
  decisions; a historical compatibility-test empty-field description.
- The upstream source archive's actual TODO filename.
- Study Pack authoring templates and the self-host guide's explicitly parameterized
  source-archive command.
- Negative validator/test fixtures, validation patterns and normal UI/CSS input
  placeholder names. These are not release metadata.

Pending null application-source fields and Liberation review fields are explicit
unresolved facts, not fabricated values. Public machine-path matches are reference
development/test commands and historical evidence in README, CONTRIBUTING,
DECISIONS, PERFORMANCE, TEST-ENVIRONMENT and milestone/RC0 reports. PERFORMANCE
now explicitly labels its reference checkout path. Installation/self-host commands
use the source root without a machine-specific location.

Ignored local audit evidence: artifacts/final-metadata-placeholder-audit.txt,
artifacts/final-metadata-path-audit.txt and artifacts/final-metadata-dist-before.json.
These are local records, not published release artifacts.

## Files prepared for the authorized metadata milestone

CHANGELOG.md, CODE_OF_CONDUCT.md, README.md, SECURITY.md, docs/DECISIONS.md,
docs/FINAL-RELEASE-READINESS.md, docs/PERFORMANCE.md, docs/RELEASE-CHECKLIST.md,
docs/RELEASE-METADATA.md, docs/SELF-HOSTING.md, docs/VERSIONING.md, package.json,
release-metadata.json. Generated dist, caches, archives and local evidence remain
excluded. No push, tag, GitHub Release or deployment is part of this task.
