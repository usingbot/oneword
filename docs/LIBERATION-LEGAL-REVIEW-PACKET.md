# Liberation Sans redistribution — legal review packet

Prepared from repository evidence at OneWord commit
[`b2af636a6975ba4d1f6b8ce5201a30eb4d21dd34`](https://github.com/usingbot/oneword/tree/b2af636a6975ba4d1f6b8ce5201a30eb4d21dd34).
This packet organizes existing findings; it is not a legal opinion or a new
technical investigation. Questions A–D below are intentionally unanswered.

## 1. Executive summary

OneWord's proposed 0.1.0 browser distribution includes four Liberation Sans TTFs
copied unchanged from `pdfjs-dist` 6.3.289. Recorded comparisons match all four
exactly to Debian `fonts-liberation 1:1.07.4-11`, whose source package includes
Liberation 1.07.4 sources plus Debian patches/build files. They do not match the
original upstream binary archive. PDF.js uses them for PDF font-data reads;
they are not OneWord's interface typeface. The production service worker caches
these resources for offline use.

Public OneWord source is available; the font-containing binary release and
deployment remain blocked by Liberation legal review/source-delivery approval.
Technical classification remains **C — modified/reprocessed binaries with
identifiable source provenance**; status remains
**LIKELY CLOSED — NEEDS LEGAL REVIEW**. Neither copying the files unchanged nor
identifying source is presented as proof of redistribution compliance.

The requested review concerns the existing filenames/naming terms and the
proposed three-file corresponding-source delivery arrangement below.

## 2. Exact font inventory and byte identity

Production location: `dist/pdf-assets/standard_fonts/`. Installed origin:
`node_modules/pdfjs-dist/standard_fonts/`. These are build/package locations,
not an assertion that the binaries are tracked in the public source repository.

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| LiberationSans-Regular.ttf | 139512 | `f8ace1f892b2bd9dc1792ba7f097fa7588f84fed48321480e04de5390828221f` |
| LiberationSans-Bold.ttf | 137052 | `361c61b82d575c5c35fd9157fda8b0194bcfcd0d88ea8521a4fb5dd53d33dddc` |
| LiberationSans-Italic.ttf | 162036 | `832b4406dbef23628800d3aaad21048534ac84d7e3ad955be83b8172ed8ef512` |
| LiberationSans-BoldItalic.ttf | 135124 | `a224075ac17495ad0a3af3bc0a419ac0704a8b3fd1095456201fb9b095fc281d` |

Recorded byte-for-byte chain, for every file:

**OneWord production → installed pdfjs-dist 6.3.289 → npm tarball → pinned
PDF.js tag/original import → Debian fonts-liberation 1:1.07.4-11 binary package.**

The arrows above denote measured byte equality, not proof of the PDF.js
importer's historical download route. That route was not recorded.
Embedded metadata says family Liberation Sans, version 1.07.4, manufacturer
Ascender Corporation and designer Steve Matteson. The copyright field identifies
Red Hat, Inc. (2007) and LIBERATION as its trademark. All four contain 681 glyphs
and 668 mapped Unicode code points.

## 3. PDF.js provenance and license correction

- Upstream: [mozilla/pdf.js](https://github.com/mozilla/pdf.js).
  [Tag v6.3.289](https://github.com/mozilla/pdf.js/releases/tag/v6.3.289) resolves to
  `1c8020a7d4e43668ac287a3ecf9a8dbea17e4c56`, also the
  [npm package registry gitHead](https://registry.npmjs.org/pdfjs-dist/6.3.289).
- The recorded npm tarball SHA-256 is
  `06f25e887adc6489f04c9fcb14198c77e4e5623a59a0bba5c4cea5838a4f1241`.
  Its SHA-512 matched the registry and OneWord lockfile.
- Original import: [34a2fa72c70ee8722a740d4d328d68df3c6ecc75](https://github.com/mozilla/pdf.js/commit/34a2fa72c70ee8722a740d4d328d68df3c6ecc75),
  2021-06-09, [PR #13517](https://github.com/mozilla/pdf.js/pull/13517).
  All four current TTFs match their original imported bytes.
- [PR #21750](https://github.com/mozilla/pdf.js/pull/21750) merged on 2026-08-10 as
  `deefadb61cedc5b71230739e7b6d30c81b24fc91`, included in the pinned release.
  It replaced the incorrect OFL notice with GPLv2/font-exception material and
  updated the font README. **No TTF changed in that correction.**
- The [pinned font README](https://github.com/mozilla/pdf.js/blob/1c8020a7d4e43668ac287a3ecf9a8dbea17e4c56/external/standard_fonts/README.md)
  describes unmodified upstream 1.07.4. The repository's measured Debian match
  qualifies that wording: unchanged within PDF.js does not mean identical to
  the original upstream binary archive.

## 4. Debian and original upstream source

The matching [Debian binary package](https://deb.debian.org/debian/pool/main/f/fonts-liberation/fonts-liberation_1.07.4-11_all.deb)
is 827812 bytes, SHA-256
`efd381517f958b01969343634ffcbdd60056be7779af84c6f53a005090430204`.
Debian's [binary record](https://packages.debian.org/bookworm/all/fonts-liberation/download)
and [source-package record](https://packages.debian.org/source/bookworm/fonts-liberation)
identify the binary/source relationship. The `.dsc` hashes and lengths matched
the downloaded source archives in the recorded inspection.

Original project: [liberationfonts/liberation-1.7-fonts](https://github.com/liberationfonts/liberation-1.7-fonts).
The [upstream 1.07.4 source archive](https://releases.pagure.org/liberation-fonts/liberation-fonts-1.07.4.tar.gz)
is byte-identical to Debian's `.orig.tar.gz` below. Its 26 regular source files
(SFDs, Makefile, FontForge scripts, license texts and other project files) match
upstream commit [1b25642191bb57c05d128f6a20d9567e3079c2b8](https://github.com/liberationfonts/liberation-1.7-fonts/commit/1b25642191bb57c05d128f6a20d9567e3079c2b8).

The [original upstream TTF archive](https://releases.pagure.org/liberation-fonts/liberation-fonts-ttf-1.07.4.tar.gz),
SHA-256 `61a7e2b6742a43c73e8762cdfeaf6dfcf9abdd2cfa0b099a9854d69bc4cfee5c`,
differs from all four shipped fonts. Debian's four-patch series corrects an Italic
localized-glyph reference, removes Cyrillic alternates/substitutions, applies a
Serif-only change, and unsets the OS/2 UseTypoMetrics flag. The Sans glyph counts
change from 682 to 681 (Regular/Bold) and 687 to 681 (Italic/BoldItalic).
All patches applied cleanly in the recorded source inspection. This is more
than a timestamp difference; patching/rebuilding explains the binary mismatch.

The [Debian build record](https://buildinfos.debian.net/buildinfo-pool/f/fonts-liberation/fonts-liberation_1.07.4-11_all.buildinfo)
identifies the exact binary hash and a FontForge-based build. **Limits:** no
independent bit-for-bit rebuild was performed; individual binary differences
were not all reverse-engineered. The `.dsc`/buildinfo PGP signatures were not
cryptographically verified. The build record contains a build-taint marker and
is not treated as an independent reproducibility attestation.

## 5. License text and notices preserved

The exact [pinned LICENSE_LIBERATION text](https://github.com/mozilla/pdf.js/blob/1c8020a7d4e43668ac287a3ecf9a8dbea17e4c56/external/standard_fonts/LICENSE_LIBERATION)
contains the Liberation exception/EULA and complete GPLv2 text, including the
source archive's `License.txt` and `COPYING`. It is **not OFL**. Installed and
production copies are 22154 bytes, SHA-256
`d2c4d5b3e115a519cb58eb691aa64538397e2611f9ebe801392cf9667997e7dc`.
The embedded license reference also points to the
[Fedora Liberation terms](https://fedoraproject.org/wiki/Licensing/LiberationFontLicense).

For reviewer attention, the existing evidence identifies GPLv2 section 3
(source distribution), exception 1(a) (document embedding), exception 1(b)
(physical products), and EULA section 2 (modified-version naming/trademark terms).
These are reading references, not conclusions about their application here.

OneWord preserves `pdf-assets/standard_fonts/LICENSE_LIBERATION` whole, together
with PDF.js's Apache notice, Adobe CMap terms and PDFium/Foxit notice. It also
preserves React/React DOM/Scheduler, Dexie license/NOTICE, ts-fsrs, Vite core MIT,
Rolldown MIT and Rolldown third-party attributions. Its own AGPL-3.0-only license,
copyright and third-party inventory are included separately. Recorded validation
checks 16 selected exact notice assets and their service-worker integrity entries;
this technical check is not legal certification.

## 6. Proposed source-delivery plan for review

After review and separate release authorization, retain these three artifacts
together, unchanged, with their names and hashes. The original source alone
omits the Debian patches/build packaging.

| Artifact / authoritative URL | Bytes | SHA-256 |
| --- | ---: | --- |
| [fonts-liberation_1.07.4-11.dsc](https://deb.debian.org/debian/pool/main/f/fonts-liberation/fonts-liberation_1.07.4-11.dsc) | 2176 | `c9cb6abc8b8ab1887d78f5fc1aef1fc06a220efbfa3424ca7e8bc379242654ba` |
| [fonts-liberation_1.07.4.orig.tar.gz](https://deb.debian.org/debian/pool/main/f/fonts-liberation/fonts-liberation_1.07.4.orig.tar.gz) | 2937949 | `ad98b7498dc2992f7f0868f79b65ce4a720a3acdb63ab3f1f1cb6881117a5406` |
| [fonts-liberation_1.07.4-11.debian.tar.xz](https://deb.debian.org/debian/pool/main/f/fonts-liberation/fonts-liberation_1.07.4-11.debian.tar.xz) | 17248 | `45ea32aab7eed82061493edbf5ef621d6fd7f074cb79ae45206014913ca5f313` |

Attach/provide the set alongside the OneWord binary archive in an approved
GitHub Release, with checksum listings and clear directions from release notes
and third-party notices. Preserve source licenses, build scripts and patch
attribution. For a hosted distribution, arrange corresponding source access
alongside the served fonts and link it clearly. Neither a bare upstream link
nor this proposed implementation is asserted legally sufficient. No artifacts
are attached, published or added to Git by preparation of this packet.

## 7. Questions for the reviewer — unanswered

**A.** Does redistribution of these Debian-modified Liberation Sans binaries
under the existing LiberationSans filenames raise any naming/trademark restriction?

**B.** Is the proposed corresponding-source delivery arrangement sufficient
for public distribution?

**C.** Is any additional notice, source offer, renaming, or distribution step required?

**D.** Is attaching/providing the three Debian source-package artifacts
alongside the GitHub release an acceptable implementation of the source delivery plan?

## 8. Repository evidence references

The packet summarizes these records, without re-running their investigations:

- [Liberation provenance](https://github.com/usingbot/oneword/blob/b2af636a6975ba4d1f6b8ce5201a30eb4d21dd34/docs/LIBERATION-SOURCE.md)
- [Third-party notices](https://github.com/usingbot/oneword/blob/b2af636a6975ba4d1f6b8ce5201a30eb4d21dd34/THIRD-PARTY-NOTICES.md)
- [Runtime notice scope](https://github.com/usingbot/oneword/blob/b2af636a6975ba4d1f6b8ce5201a30eb4d21dd34/docs/THIRD-PARTY-RUNTIME.md)
- [Release checklist](https://github.com/usingbot/oneword/blob/b2af636a6975ba4d1f6b8ce5201a30eb4d21dd34/docs/RELEASE-CHECKLIST.md)

Historical gate results in the provenance record describe their original task;
the current public-source status does not complete Liberation review.

## 9. Reviewer response template

Reviewer:

Date:

Scope reviewed:

Decision:

- [ ] Approved as documented
- [ ] Approved with required changes
- [ ] Not approved / further review required

Required changes, if any:

Naming/trademark conclusion:

Source-delivery conclusion:

Additional notice/source-offer requirements:
