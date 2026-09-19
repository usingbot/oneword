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

## Source/build mapping — prepared, not published

Intended identity: **OneWord 0.1.0 → tag v0.1.0 → approved full release commit →
https://github.com/usingbot/oneword**. No tag/release URL is advertised before it
exists. The initial metadata-preparation baseline was
`e52ad5c716e844b29e1b25341db2f1af3ef47984`; it is not asserted to be the final
release commit. This preparation itself changes release-facing files.

At the separately authorized source freeze/publication step:

1. Select the approved clean source commit and capture `git rev-parse HEAD`.
   Confirm package.json, lockfile and release.version agree; freeze the source
   used for the build. Do not substitute a moving branch or an earlier baseline.
2. Record that full commit and its real canonical repository `/tree/` URL in
   applicationSource. Keep verified=false until anonymous access to that exact
   complete source is checked. Do not invent a URL containing an unknown commit.
3. Build from that source and retain an external release record tying version,
   full source SHA, intended tag, build label, generated SW hash and artifact
   SHA-256 checksums together. A commit cannot contain its own hash: finalize
   this record after the source commit exists, rather than repeatedly amending
   the source or pointing at the parent to force the gate green.
4. After authorized publication, verify the complete source is accessible without
   credentials and corresponds to the distributed build, including build scripts,
   lockfile, licenses and modifications. Only then attest public access and run
   release:check using the finalized release record. Commit any later source
   changes separately and re-evaluate the mapping before distributing artifacts.
5. Create the matching tag and release artifacts only with separate approval.

For this preparation applicationSource.commit/url remain null and verified=false.
The existing validator therefore still rejects missing exact-source identity and
unverified public access. This is intentional truthful pending data, not a fake
canonical URL. No source-access verification or publication was performed here.
The final release-record handoff must be completed in the authorized publication
workflow; this task does not add a validator bypass or a new publishing tool.

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
