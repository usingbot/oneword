# Liberation Sans provenance and corresponding source

Reviewed 2026-09-19 from clean main, OneWord commit e62064f.
Result: **LIKELY CLOSED — NEEDS LEGAL REVIEW**.
Technical classification: **C — modified/reprocessed binaries with identifiable
source provenance**. All four exact TTFs match Debian's published
fonts-liberation 1:1.07.4-11 package. Its complete source package is identified
below. This is not an independently reproduced font build (B), or byte identity
with the original upstream Liberation binary release (A).

The earlier archive mismatch is explained by the patched Debian build. Legal
sufficiency of redistribution, including naming/trademark terms and actual source
delivery, still needs review. The release metadata remains needs-external-review;
no validator or release declaration has been relaxed.

## Exact local inventory

Exactly four Liberation TTFs occur under **dist/pdf-assets/standard_fonts/**.
Each filename below also exists under **node_modules/pdfjs-dist/standard_fonts/**
(installed version 6.3.289). Production, installed package, freshly downloaded npm
tarball, pinned PDF.js tag, original PDF.js import commit and Debian binary package
agree byte-for-byte for every file. OneWord does not transform these fonts.

| Filename | Bytes | SHA-256 |
| --- | ---: | --- |
| LiberationSans-Regular.ttf | 139512 | f8ace1f892b2bd9dc1792ba7f097fa7588f84fed48321480e04de5390828221f |
| LiberationSans-Bold.ttf | 137052 | 361c61b82d575c5c35fd9157fda8b0194bcfcd0d88ea8521a4fb5dd53d33dddc |
| LiberationSans-Italic.ttf | 162036 | 832b4406dbef23628800d3aaad21048534ac84d7e3ad955be83b8172ed8ef512 |
| LiberationSans-BoldItalic.ttf | 135124 | a224075ac17495ad0a3af3bc0a419ac0704a8b3fd1095456201fb9b095fc281d |

Embedded name-table fields independently decoded from each TTF:

| Field | Value |
| --- | --- |
| Family (ID 1) | Liberation Sans, all four |
| Style (ID 2), in table order | Regular; Bold; Italic; Bold Italic |
| Version (ID 5) | Version 1.07.4, all four |
| Copyright (ID 0) | Copyright (c) 2007 Red Hat, Inc. All rights reserved. LIBERATION is a trademark of Red Hat, Inc. |
| Manufacturer / designer (IDs 8/9) | Ascender Corporation / Steve Matteson |
| License description (ID 13) | Licensed under the Liberation Fonts license, see https://fedoraproject.org/wiki/Licensing/LiberationFontLicense |
| License URL (ID 14) | https://fedoraproject.org/wiki/Licensing/LiberationFontLicense |

All four contain 681 glyphs and the same 668 mapped Unicode code points.
The Reader/UI does not use these as its interface font. PDF.js internally reads
them for non-embedded Helvetica and recognized substitute names. OneWord uses
useSystemFonts=false, disableFontFace=true, enableXfa=false and a local
standardFontDataUrl; disabling FontFace does not disable font-data reads.
The accepted PDF browser case verifies a real same-origin Regular font response
against installed bytes, with service-worker precache disabled for that case.

## PDF.js package, import and license correction

- Repository: [mozilla/pdf.js](https://github.com/mozilla/pdf.js).
- [Release v6.3.289](https://github.com/mozilla/pdf.js/releases/tag/v6.3.289):
  tag commit **1c8020a7d4e43668ac287a3ecf9a8dbea17e4c56**, also the registry gitHead
  for [npm 6.3.289](https://registry.npmjs.org/pdfjs-dist/6.3.289).
- Fresh pdfjs-dist-6.3.289.tgz: 8503425 bytes, SHA-256
  06f25e887adc6489f04c9fcb14198c77e4e5623a59a0bba5c4cea5838a4f1241.
  Its SHA-512 matches both registry dist.integrity and OneWord's lockfile.
  The package-level Apache-2.0 declaration does not replace font-specific terms.
- All four font-path histories contain the same addition:
  [34a2fa72c70ee8722a740d4d328d68df3c6ecc75](https://github.com/mozilla/pdf.js/commit/34a2fa72c70ee8722a740d4d328d68df3c6ecc75),
  committed 2021-06-09, [PR #13517](https://github.com/mozilla/pdf.js/pull/13517).
  Raw files at that commit match every current font. The addition supplied XFA
  substitution fonts and per-glyph scaling data; it recorded no font-build recipe
  or exact download URL. Its discussion does not identify the importer's retrieval
  channel. Byte identity with Debian does not prove which URL the developer used.
- [PR #21750](https://github.com/mozilla/pdf.js/pull/21750) merged on 2026-08-10
  as **deefadb61cedc5b71230739e7b6d30c81b24fc91**. The release notes list it;
  the GitHub compare API reports the release tag 171 commits ahead, with that
  commit as merge base. Only LICENSE_LIBERATION and the font README changed;
  the incorrect OFL notice became GPLv2/font-exception material. No TTF changed.
- Installed and production LICENSE_LIBERATION are 22154 bytes, SHA-256
  d2c4d5b3e115a519cb58eb691aa64538397e2611f9ebe801392cf9667997e7dc.
  They match the npm tarball and pinned upstream file, and contain the source
  archive's complete License.txt and COPYING texts. PDF.js's Apache license and
  the other font/resource notices remain preserved separately.

The PR and [pinned font README](https://github.com/mozilla/pdf.js/blob/1c8020a7d4e43668ac287a3ecf9a8dbea17e4c56/external/standard_fonts/README.md)
describe the fonts as unmodified upstream 1.07.4. Our checksum comparison qualifies
that description: they are unchanged within PDF.js since import, but match the
patched Debian package, not the original upstream binary archive. The license
correction is verified; its broad binary-origin wording is not proof of A.

## Authoritative upstream source and Debian correspondence

The upstream project is
[liberationfonts/liberation-1.7-fonts](https://github.com/liberationfonts/liberation-1.7-fonts).
It identifies the pre-2.0 family as GPLv2 with exceptions and links releases at
[releases.pagure.org/liberation-fonts](https://releases.pagure.org/liberation-fonts/).
Use the explicit filenames below: the project's displayed 1.07.4 binary link
points to a different release. The explicitly named 1.07.4 archive is available.

The source archive has 26 regular files: 16 SFDs (including all four Sans styles),
Makefile, three FontForge scripts, AUTHORS, ChangeLog, COPYING, License.txt,
README and TODO. All 26 file contents match Git blob hashes at upstream commit
[1b25642191bb57c05d128f6a20d9567e3079c2b8](https://github.com/liberationfonts/liberation-1.7-fonts/commit/1b25642191bb57c05d128f6a20d9567e3079c2b8).
The earlier commit titled “Commit for 1.07.4 release” is not an exact archive
match; the later version-update commit is. No 1.07.4 Git tag is invented.

| Fresh artifact and authoritative URL | Bytes | SHA-256 |
| --- | ---: | --- |
| [liberation-fonts-1.07.4.tar.gz](https://releases.pagure.org/liberation-fonts/liberation-fonts-1.07.4.tar.gz) — source | 2937949 | ad98b7498dc2992f7f0868f79b65ce4a720a3acdb63ab3f1f1cb6881117a5406 |
| [liberation-fonts-ttf-1.07.4.tar.gz](https://releases.pagure.org/liberation-fonts/liberation-fonts-ttf-1.07.4.tar.gz) — original binary | 1333593 | 61a7e2b6742a43c73e8762cdfeaf6dfcf9abdd2cfa0b099a9854d69bc4cfee5c |
| [fonts-liberation_1.07.4.orig.tar.gz](https://deb.debian.org/debian/pool/main/f/fonts-liberation/fonts-liberation_1.07.4.orig.tar.gz) — same source, Debian filename | 2937949 | ad98b7498dc2992f7f0868f79b65ce4a720a3acdb63ab3f1f1cb6881117a5406 |
| [fonts-liberation_1.07.4-11.debian.tar.xz](https://deb.debian.org/debian/pool/main/f/fonts-liberation/fonts-liberation_1.07.4-11.debian.tar.xz) — patches/packaging | 17248 | 45ea32aab7eed82061493edbf5ef621d6fd7f074cb79ae45206014913ca5f313 |
| [fonts-liberation_1.07.4-11.dsc](https://deb.debian.org/debian/pool/main/f/fonts-liberation/fonts-liberation_1.07.4-11.dsc) — source manifest | 2176 | c9cb6abc8b8ab1887d78f5fc1aef1fc06a220efbfa3424ca7e8bc379242654ba |
| [fonts-liberation_1.07.4-11_all.deb](https://deb.debian.org/debian/pool/main/f/fonts-liberation/fonts-liberation_1.07.4-11_all.deb) — matching binary | 827812 | efd381517f958b01969343634ffcbdd60056be7779af84c6f53a005090430204 |

Debian's [binary download record](https://packages.debian.org/bookworm/all/fonts-liberation/download)
independently lists that package SHA-256. Its
[source-package record](https://packages.debian.org/source/bookworm/fonts-liberation)
maps the binary to 1:1.07.4-11 and the three source files above. Both source hashes
and lengths match the downloaded .dsc. Debian's original tarball is byte-identical
to Liberation's authoritative source, not decompiled fonts.

The [Debian build record](https://buildinfos.debian.net/buildinfo-pool/f/fonts-liberation/fonts-liberation_1.07.4-11_all.buildinfo)
lists the exact .deb hash, build date 2020-02-22 22:52:07 UTC, FontForge
1:20190801~dfsg-2, fonttools 4.2.4-1 and dh-strip-nondeterminism 1.6.3-2.
Its SHA-256 is 9f218eeaea238712768a907aa40ee8671bd34730d07e2f150c2d9d4fc8f8db33.
It also records Build-Tainted-By: usr-local-has-programs; it is packaging evidence,
not an independent reproducible-build attestation. PGP signatures on .dsc and
.buildinfo were retained but not cryptographically verified here. Downloads used
HTTPS; checksums were cross-checked as described.

## Why the original TTF archive differs

Debian's patch series applies four patches to the original SFD source:

1. 0001-Resolved-1009650-Resolved-issue-with-Liberation-Sans.patch, from upstream
   1b8ba6e74ec6d3632b29ec46414a42970af92d95, corrects an Italic localized-glyph
   name/reference.
2. 0002-resolved-1094779.patch, from
   [b72da688058b451a9aef8baf0fc1d4ddc49060e5](https://github.com/liberationfonts/liberation-1.7-fonts/commit/b72da688058b451a9aef8baf0fc1d4ddc49060e5),
   removes localized Cyrillic alternates/substitutions: Regular/Bold 682 → 681
   glyphs, Italic/BoldItalic 687 → 681.
3. 0003-Resolved-https-bugzilla.redhat.com-show_bug.cgi-id-1.patch, from
   819661898cf7b177602210b019821e98e4d901b3, changes Serif, not shipped Sans.
4. unset_OS2_UseTypoMetrics.patch changes the source metric flag to zero.

All four patches applied cleanly in order to an isolated source copy. All four
resulting Sans SFDs contain exactly 681 glyph records. The unchanged upstream
Makefile drives scripts/fontexport.pe, which opens SFDs in FontForge and exports
TTF with flag 0x800; debian/rules invokes debhelper. Neither that build nor
downloaded executable scripts were run in this task.

| Prepared source after Debian patch series | SHA-256 |
| --- | --- |
| src/LiberationSans-Regular.sfd | e10209ca44a036c3ec9d584df47af5164482234f7d8fb2c564be95ca290a12cd |
| src/LiberationSans-Bold.sfd | 454920667f566790b783980d9bf38e5e6f4885167ef1046345ccbfe7ac71b78d |
| src/LiberationSans-Italic.sfd | 1d3f40eb8894f43164a3677d269e27ecf5bb1a53482428bb09dddcf868a757c8 |
| src/LiberationSans-BoldItalic.sfd | 4571fe676e0266b614c4cd19269b537def216945007df498d83cdd8ed975461d |

Independent TTF inspection found equal Unicode coverage and advance widths for
all 668 mapped code points in each style. The name, cvt, fpgm, gasp and prep
tables also match the original upstream binaries; other tables differ. Removed
alternates and rebuilding explain why equal version/coverage does not imply equal
files. Individual serialization/outline differences were not all reverse-engineered.
Exact equality to Debian's output and its source/patch records establish technical
source correspondence. No independent bit-for-bit build is claimed.

The complete evidence chain is:

- OneWord production TTF = installed pdfjs-dist 6.3.289 = npm tarball.
- Those bytes = PDF.js tag 1c8020a7… = original import 34a2fa72….
- Those bytes = font members of Debian fonts-liberation_1.07.4-11_all.deb.
- Debian maps that binary to its original 1.07.4 source plus patch/build archive.
- All 26 original source files match Liberation upstream commit 1b256421….

Equality denotes measured byte identity. The Debian source/build relationship is
published metadata corroborated by hashes and patch inspection. The importer's
historical download channel remains unrecorded, but an exact matching binary
has an identified source package. That distinction is why this is C, not A or B.

## Technical facts versus legal interpretation

**Technical facts:** the shipped notice contains GPL version 2 plus the Liberation
font exceptions/EULA, not OFL. GPLv2 section 3 describes source-distribution
alternatives, preferred source/build scripts, and equivalent source access from
the same designated place. Exception 1(a) addresses embedding fonts in documents;
1(b) addresses physical-product source access/modification/reinstallation.
EULA section 2 contains naming/trademark conditions for modified versions.
Read the [Liberation terms](https://fedoraproject.org/wiki/Licensing/LiberationFontLicense)
and the actual LICENSE_LIBERATION, including its complete GPLv2 text.

**NEEDS LEGAL REVIEW:** determine how those naming/trademark conditions apply to
onward redistribution of the patched Debian fonts, whether the proposed source
delivery satisfies the chosen distribution method, and whether additional
permission/evidence is needed. OneWord copying unchanged files does not settle
upstream modifications' legal status. Neither the document-embedding exception
nor PDF.js's Apache license is a blanket font-redistribution exemption.

## Proposed smallest release arrangement — not published

After legal review and separate release authorization:

1. Preserve existing font license/exception, PDF.js notices and attribution.
2. Retain the three **Debian source-set files** together with exact names/hashes
   above: fonts-liberation_1.07.4-11.dsc, fonts-liberation_1.07.4.orig.tar.gz and
   fonts-liberation_1.07.4-11.debian.tar.xz (2957373 bytes total). The original
   source alone omits the patches. Keep supplied build scripts, copyrights and
   patch attribution; a selective SFD-only bundle is not proposed.
3. Attach that set alongside the OneWord binary archive in an approved GitHub
   Release, with checksums and directions from release notes/THIRD-PARTY-NOTICES.
   For hosting, arrange equivalent source access alongside the served font
   distribution and link it clearly; have the reviewer confirm that arrangement.
   A bare external upstream link is not asserted sufficient. The .deb/.buildinfo
   are useful audit evidence; binary archives do not substitute for source.
4. Only after review and accessible distribution, record its real URL and review
   evidence in liberationSource. No completed flag or publication claim is added
   now. An extra bespoke source bundle is unnecessary if the reviewer accepts
   this complete set; add one only if needed.

No archives are added to Git. Downloads remain ignored local evidence.
release:check remains blocked on Liberation review/source delivery and the three
unrelated user/source-metadata groups.

## Omission contingency and verification limits

The exact source package is identified, so removal is not proposed. If legal
review still prevents distribution, omission needs a separate technical decision.
The accepted PDF test requires a successful local font response; current SW
precache also requires those files. Removing deployed files alone would fail
installation integrity. PDF.js fetchStandardFontData catches missing-font fetches
and returns null, so not every PDF would necessarily fail text extraction.
Nevertheless, metrics/fallback changes can affect text geometry, spacing/order
and substitute-font behavior; acceptable behavior across supported PDFs has not
been established. XFA is disabled and is not a OneWord feature dependency.
No font removal, substitution, rebuild or omission experiment was performed.

This task changes documentation only. Runtime/build rules, dependencies and
release metadata stay unchanged. The accepted browser baseline is 91/91
Chromium/WSL and 1/1 Firefox, zero skip/retry/xfail, from
[RC0-KEYBOARD-REVIEW.md](RC0-KEYBOARD-REVIEW.md); it is reused, not rerun.
Current documentation-update verification:

| Command/check | Result |
| --- | --- |
| npm run typecheck / npm run lint | PASS |
| npm test | PASS: 185/185 unit/integration (14 files, 12.33 s) and 12/12 release-validator tests |
| npm run build | PASS, Vite build 3.99 s |
| npm audit | 0 vulnerabilities |
| npm run verify:release | PASS: 16 exact notice assets, package metadata, SW integrity and production CSP |
| git diff --check / git diff HEAD --check | PASS |
| Runtime/font preservation | All eight dist/assets files retain their names/hashes; all four rebuilt fonts match installed copies |
| npm run release:check | Expected exit 1: six missing/unverified contact/application-source declarations and one Liberation legal/source-delivery blocker |

Logs: artifacts/liberation-typecheck.log, liberation-lint.log,
liberation-test.log, liberation-build.log, liberation-audit.log,
liberation-notices.log and liberation-readiness.log. The updated notice payload
and generated SW manifest change with the documentation; executable assets and
build behavior do not. No full browser rerun or clean dependency install is
claimed for this documentation task.

Ignored local evidence: .tools/liberation-provenance/ contains downloaded API
records, archives, pinned fonts, Debian source and prepared SFDs, plus
debian-comparison.json, source-correspondence.json and
upstream-source-tree-comparison.json. Artifacts under artifacts/ are
liberation-provenance-inventory.json and the liberation-provenance-fetch.mjs,
-download.mjs, -inspect.py, -debian.py and -source.py inspection scripts.
These document retrieval, stdlib archive/SFNT inspection and isolated patch checks.
FontTools was unavailable; no dependencies were installed. These checks are not
a font renderer, a source rebuild or a legal certification.
No commit, push, tag, release or deployment occurred.
