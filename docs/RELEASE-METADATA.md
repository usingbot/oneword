# Release identity and readiness

[release-metadata.json](../release-metadata.json) is the single editable record for
public release identity, private reporting routes and source-review status. Never
put tokens, passwords or private reports in it.

The owner supplied the repository during RC0 closure. A read-only check on
2026-09-18 found it public and empty; this is not a published OneWord source
release. No remote, push, repository or reporting service was configured here.
package.json omits repository/homepage/bugs rather than duplicating this record.

| Field | Required owner value/evidence | Current status |
| --- | --- | --- |
| `repositoryUrl` | Canonical HTTPS source repository | Supplied; empty destination exists. |
| `security.privateContact` | Real monitored private mailto/HTTPS reporting route | WAITING FOR USER INPUT. |
| `security.verified` | True after configuration and benign private receipt test | False. |
| `conduct.privateContact` | Real private enforcement contact; not public issues or security advisories | WAITING FOR USER INPUT. |
| `conduct.verified` | True after confirming private receipt by responsible maintainers | False. |
| `applicationSource.commit` | Full 40-character approved release source commit | Pending freeze/authorization. |
| `applicationSource.url` | Accessible exact-source URL containing that commit | Pending authorized source publication. |
| `applicationSource.verified` | Confirm complete corresponding source and public access | False; empty repository is insufficient. |
| `runtimeNotices` | Complete pinned runtime review and checked-in evidence | Technical review complete; artifact checks separate. |
| `liberationSource` | Exact font/source review, accessible distribution URL and evidence file | NEEDS EXTERNAL/LEGAL REVIEW; [font evidence](LIBERATION-SOURCE.md). |

Null/false/pending values intentionally block publication. Verification flags are
maintainer attestations, not proof of a live monitored endpoint. Do not invent
addresses or set flags merely to pass. SECURITY/Code of Conduct refer to this
record so routes need be filled once.

For GitHub private vulnerability reporting, an owner/admin opens **Settings →
Security and quality → Advanced Security → Private vulnerability reporting →
Enable**. Confirm **Security → Advisories → Report a vulnerability**, notifications
and private receipt with benign synthetic information. Then record the actual
reporting URL. This is not claimed enabled and does not replace a conduct contact.
[Official instructions](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/configure-for-a-repository).

After typecheck/lint/test/build/audit, run `npm run verify:release`,
`npm run verify:csp`, then `npm run release:check`. The first two check package,
built CSP and selected notice/SW bytes without public metadata. The last also
rejects missing/unverified contacts, fictional/public-issue URLs, missing exact
source, unresolved notices or required font-source review; it exits **1** while
blocked. This expected rejection is not a successful release gate.

Readiness validation is deliberately separate from dev/build/core CI. It requires
no secrets, sends no mail and configures no services. A pass does not authorize
publication or replace the complete WSL/Firefox gate, live source/channel checks,
legal review, hosted CI or deployed-origin verification.
