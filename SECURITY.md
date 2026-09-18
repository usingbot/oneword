# Security policy

## Supported versions

No public release has been published yet. The proposed first version is 0.1.0.
For this pre-1.0 project, security fixes will target the latest published 0.x
release and the main development branch. Older 0.x releases have no promised
backports or response-time SLA. Use a tested release and retain Personal Backups
before upgrading; version numbers do not guarantee every browser is supported.

## Private reporting — publication blocker

**Publication blocker until configured:** the private route is recorded as
`security.privateContact` in [release metadata](release-metadata.json). Use it only
when `security.verified` is true. Null/false means no verified working route is
configured. No invented address is provided. See [configuration instructions](docs/RELEASE-METADATA.md),
including GitHub private vulnerability reporting as an option once enabled.

Once enabled, use that private channel for suspected vulnerabilities. Until it
exists, do not post exploit details in a public issue; ask the maintainer only
for a private reporting route without disclosing the vulnerability. There is
no monitored security inbox advertised while the central record remains unset.

Include the affected commit/version, browser and OS, a minimal reproduction,
expected/actual behavior, impact, relevant sanitized console messages and any
proposed mitigation. Prefer synthetic PDF/JSON/image fixtures. **Do not send
private learning documents, real Personal Backups, credentials or unrelated
personal data.** Coordinate disclosure privately; maintainers will agree next
steps with the reporter rather than promise a deadline they cannot staff.

## Threat boundaries

OneWord is a static, local-first browser application. It does not isolate data
from an attacker controlling the device, extensions, origin or distributed JS.
Serve trusted builds over HTTPS and keep dependencies current. The service
worker is persistent same-origin code; review update/cache changes carefully.

PDFs and Study Pack/Backup JSON are untrusted input. PDF JavaScript/actions are
not executed; text renders as text; JSON is versioned, bounded and validated
before atomic writes. These controls do not prove every hostile PDF is safe or
prevent all parser/resource-exhaustion bugs. Remote HTTPS images are opt-in and
can disclose metadata to their host. Do not add arbitrary HTML, URL protocols,
silent uploads, or migrations that recover by wiping user data.

Backups are unencrypted. Do not attach production data to issues, CI logs,
screenshots or traces. A malformed/future database is retained with recovery
guidance; see [RECOVERY.md](docs/RECOVERY.md). Non-security bugs belong in the bug
template after removing sensitive material.
