# Release identity and readiness

[release-metadata.json](../release-metadata.json) records public release identity,
private reporting routes and source-review status. Never put credentials or
private reports in it. package.json is the version authority; its repository,
homepage and bugs fields mirror the canonical destination.

## Configured owner metadata

- Canonical repository: https://github.com/usingbot/oneword.
- Candidate version: **0.1.0**; planned tag **v0.1.0**, not created.
- Security fallback: [andmx3456@gmail.com](mailto:andmx3456@gmail.com).
- Code of Conduct enforcement: [andmx3456@gmail.com](mailto:andmx3456@gmail.com).
- On 2026-09-19 the owner explicitly confirmed receipt testing and monitoring for
  both private channels. Both verified flags record that owner attestation;
  the agent did not send mail or inspect the inbox.

GitHub Private Vulnerability Reporting should be enabled and receipt-tested after
repository/source publication. Prefer it **if enabled**, then the configured
email fallback. It is not claimed enabled here. Follow the
[official configuration instructions](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/configure-for-a-repository).
Never route sensitive vulnerabilities to public issues; vulnerability advisories
are also not a Code of Conduct enforcement channel.

## Source/build mapping — live public HEAD

Source-only publication is authorized at https://github.com/usingbot/oneword.
It does not authorize a tag, binary release, deployment or Liberation distribution.
See [source publication evidence](PUBLIC-SOURCE.md).

applicationSource.mode is public-head. On each `npm run release:check`,
scripts/public-source.mjs resolves local HEAD at execution time and requires:

1. A clean tracked/untracked source tree.
2. Unauthenticated Git main from the canonical repository equal to local HEAD.
3. Unauthenticated GitHub API access showing a public repository and the exact
   commit with the same source-tree object as local Git.
4. A publicly accessible source tree containing src, plus README, LICENSE,
   SECURITY.md and CONTRIBUTING.md matching the committed source.

The checked full SHA and exact /tree/ URL are printed by the command and supplied
in memory to the existing metadata validator. No SHA or verified flag is persisted
back to Git. Network errors, private access, stale public main, differing files or
local changes fail closed; there is no fallback to an earlier verification.

This closes source identity/access only when the live checks actually pass.
It does not assert a released version or approve the font-source/legal review.
A later authorized v0.1.0 tag must point to the exact reviewed public source commit;
record its build/checksums separately after source freeze, without a self-referential
tracked commit hash. Version 0.1.0 is still an unreleased candidate.

## Version and build identity

package.json and package-lock.json already use 0.1.0; release.version mirrors it.
README, CHANGELOG and the release checklist describe the same unreleased candidate.
The web manifest has stable app identity and no independent release-version field;
no version is added to its name/id/start URL. Service-worker identity is the
existing hash of its template and precached assets, not SemVer. The default HTML
build label remains production. These independent identities must be recorded
with the final source/build mapping; they do not conflict with package version.
No manifest, SW, runtime or build-logic change is required.

## Liberation and readiness policy

Liberation remains **LIKELY CLOSED — NEEDS LEGAL REVIEW**. The validator status
stays needs-external-review with distributionUrl/reviewEvidence unset; technical
provenance evidence is not an approved legal review. Preserve the three Debian
source-set artifacts with the exact URLs and SHA-256 values in
[LIBERATION-SOURCE.md](LIBERATION-SOURCE.md). After legal/source-delivery approval,
provide them alongside release binaries and arrange appropriate source access for
hosted fonts. Nothing is downloaded, committed as an archive or published here.

After typecheck/lint/test/build/audit, run `npm run verify:release`,
`npm run verify:csp`, then `npm run release:check`. The first two check package,
built CSP and selected notice/SW bytes. The last also rejects missing/unverified
contacts, fictional/public-issue URLs, missing exact source and required font-source
review. Its expected exit 1 is a blocked readiness gate, not a release pass.

Contact flags are maintainer attestations, not live endpoint checks. A readiness
pass would still not authorize publication or replace hosted CI, deployed-origin
verification, legal review or the browser evidence. See
[current results](FINAL-RELEASE-READINESS.md).
