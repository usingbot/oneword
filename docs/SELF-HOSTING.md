# Self-hosting OneWord

OneWord builds to a static **dist/** directory. You do not need a database server,
API server, AI service or cloud account. A web server is still needed to serve
the files; `file://` is not a supported application origin.

## Build and preview

Install Git and Node.js 24.21.0 with npm. Obtain the source from the project's
repository when source is published (the selected destination is in
[release metadata](../release-metadata.json); an empty repository is not a source offer).
From the source root:

```sh
npm install
npm run build
npm run verify:release
npm run preview
```

The lockfile is committed. For a repeatable deployment/build machine prefer
`npm ci` instead of `npm install`; do not use production-only dependency
installation because Vite/TypeScript are build dependencies. Do not share a
node_modules directory across OSes. Preview binds to http://127.0.0.1:4173 and
is for local inspection, not a hardened public server.

Serve **all of dist/** as the document root of your chosen static server. Do not
serve the source checkout, node_modules, .git, .tools or browser test artifacts.
The production host only needs the built static files, not Node or npm.

## Origin, paths and response requirements

- The supported base path is `/` on a dedicated origin. `/oneword/` subpath
  hosting is not supported by the current absolute URLs and SW scope.
- This app has no client-side pathname router: `/` and `/index.html` open it.
  Hash links are page anchors. Do not rewrite missing JS/PDF asset requests to
  index.html; returning HTML for a missing module breaks loading and integrity.
- Use HTTPS in production. Localhost is a browser development exception.
  Keep `/sw.js` at the origin root with scope `/`; no wider scope header is needed.
- Serve `.js` and `.mjs` as JavaScript (`text/javascript`), `.css` as `text/css`,
  `.html` as `text/html`, `.webmanifest` as `application/manifest+json`, PNG/SVG
  with their image MIME types, and `.txt` notices as `text/plain`. Preserve font
  and binary CMap bytes; use suitable font types or `application/octet-stream`.
- Keep PDF.js, its worker, CMaps and standard fonts on the same origin. Retain
  the complete `pdf-assets/` directory, including upstream license files. Do not
  replace these assets with a CDN or cross-origin worker URL.
- Serve SW, index, manifest and unhashed notices/assets with revalidation (for
  example `Cache-Control: no-cache`). Content-hashed `assets/` files can use
  `Cache-Control: public, max-age=31536000, immutable`. Apply immutable only to
  hashed paths, not all files. Compression may be configured by the host.
- Preserve the built CSP. Do not require unsafe script execution to host the
  production build. Avoid unrelated apps on this same origin: they share its
  trust/storage boundary.

These are server requirements, not a claim that every nginx/Apache/Caddy setup
was tested. The reference `scripts/serve-built.mjs` server uses loopback,
no-store and explicit MIME mappings for browser tests; it is not a production
web server. No vendor-specific configuration is presented as verified here.

## Publish and update safely

Prepare a complete build and switch releases atomically. Keep previous hashed
assets available during the transition. The SW validates its static allowlist
with integrity; a partial/mismatched build is rejected and the old cache remains.
Do not edit dist files after their integrity hashes were generated: change the
source/configuration and rebuild instead.

After first online preparation, the shell and local content can open offline.
Remote HTTPS images still depend on network/CORS. Updates wait and show a
user-controlled action. Finish editing/importing/reading/studying, return to
Reader and close other OneWord tabs before updating. The app waits for safe
writes and does not delete IndexedDB. See [OFFLINE.md](OFFLINE.md).

Changing scheme, hostname or port creates a different local storage origin.
Users need to export Personal Backup at the old origin and restore at the new
one. Rolling back app files cannot safely downgrade a newer database schema;
test compatibility and preserve backups instead of clearing user storage.

## Source and notices before making a public instance available

Retain the project's AGPL license and all third-party notices shipped in dist.
Make the complete corresponding source for the exact served build available,
including your modifications, build scripts, lockfile and license notices.
Provide a prominent source/license link from the instance or its hosting page;
do not offer only an unrelated/latest branch. Follow the actual [LICENSE](../LICENSE)
terms, including section 13 where applicable. User content remains separately
licensed. Required public repository/source-offer URLs are release checklist
items, not invented links in M4b.

A source archive can be prepared from the approved release commit using
`git archive --format=tar.gz --output=oneword-source.tar.gz <release-commit>`;
replace the placeholder with the verified commit. This command is documentation
only and was not used to create a release/tag in M4b. Provide any additional
corresponding third-party source required by its own license, particularly the
bundled Liberation font license/exception; do not assume the app AGPL replaces it.

Run the [release checklist](RELEASE-CHECKLIST.md) on a staging origin before
production, including a real cache-to-cache upgrade and backup round-trip.
M4b does not deploy any instance or enable a public security-reporting channel.

RC0 adds `npm run verify:csp` for built production policy and `npm run release:check`
for publication blockers. Run both after build/notice validation. Development HMR
uses Vite's separate serve-only policy handling; production connections are
same-origin only. Readiness validation fails until private contacts, exact source
and [font-source review](LIBERATION-SOURCE.md) are complete. See
[release metadata instructions](RELEASE-METADATA.md).
