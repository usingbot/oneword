# Privacy

OneWord processes learning data in your browser by default. It has no account,
application API server, analytics, telemetry, AI API or cloud synchronization.
PDF bytes are parsed locally. Documents, extracted text, Study Packs, flashcards,
FSRS schedules/events and Quiz attempts are stored in IndexedDB on your device.
The original PDF binary is not retained in the library. Personal Backups are
local JSON downloads; importing or exporting one does not upload it.

Expected network traffic is:

- Same-origin static application files, including the PDF.js worker, CMaps,
  fonts, icons, service worker and license notices. Offline preparation downloads
  these assets even before you open a PDF. Updates check the same origin.
- External HTTPS images only after the existing explicit load action. Their
  hosts can see your IP and request metadata, including an Origin header. The
  app requests anonymous CORS and no referrer; the host must permit CORS.
  OneWord does not proxy or deliberately persist remote image bytes. The browser's
  normal HTTP cache may retain them.

The static host can log visits and asset requests. A self-host operator controls
that server and can modify the served code. Browser extensions, device access,
malicious replacement code and an insecure host are outside this local-storage
boundary. Local-first is not an absolute privacy or encryption guarantee.

IndexedDB and CacheStorage belong to a browser profile and origin (scheme,
hostname and port). Changing origin does not transfer data. Clearing site data,
private browsing, storage eviction or device loss can remove it. The optional
persistent-storage request does not make data permanent.

Personal Backup JSON is **not encrypted** and includes personal study history.
Store it privately. Study Pack exports contain shareable content, not personal
attempts or scheduling history; review their text, sources and image URLs before
sharing. Deleting a pack can retain personal audit history; clearing site data
removes the origin's local library. Export a backup first if you need a copy.

Software licensing does not change ownership or licensing of imported content.
See [recovery](docs/RECOVERY.md), [offline behavior](docs/OFFLINE.md) and
[security reporting](SECURITY.md). Evidence and its limitations are recorded in
[the test environment](docs/TEST-ENVIRONMENT.md).
