# Liberation Sans: technical necessity and source review

Status: **NEEDS EXTERNAL/LEGAL REVIEW**. Technical inventory is complete; an
acceptable corresponding-source arrangement for the exact shipped binaries is
not asserted. Do not replace these fonts or mark the source review complete merely
because an archive with the same version number is available.

## What ships and why

`pdfjs-dist` **6.3.289** supplies four Liberation Sans TTF files in
`node_modules/pdfjs-dist/standard_fonts/`. The Vite PDF-assets plugin copies them
unchanged into `dist/pdf-assets/standard_fonts/`, along with `LICENSE_LIBERATION`.
The SW precaches those same-origin resources for offline PDF ingestion.

OneWord configures PDF.js with `standardFontDataUrl` pointing there,
`useSystemFonts: false` and `disableFontFace: true`. Disabling FontFace registration
does not disable PDF.js's internal font reads. Its evaluator's standard-font map
uses these files for Helvetica/Helvetica-Bold/Helvetica-Oblique/
Helvetica-BoldOblique and supported substitute names; text-content extraction can
load them even though OneWord does not render PDF page canvases.
The Reader/UI CSS does not use Liberation as an application typeface.

A dedicated browser case disables SW registration for that test, imports a
synthetic PDF with non-embedded Helvetica, verifies the extracted text, and
checks the exact same-origin LiberationSans-Regular.ttf response against the
installed bytes. This distinguishes an ingestion request from generic SW precache.
Other weights remain necessary for corresponding PDF font variants. No font was
removed and no dependency or extraction setting was changed.

| File | Bytes | SHA-256 of installed/shipped file |
| --- | ---: | --- |
| LiberationSans-Regular.ttf | 139512 | `f8ace1f892b2bd9dc1792ba7f097fa7588f84fed48321480e04de5390828221f` |
| LiberationSans-Bold.ttf | 137052 | `361c61b82d575c5c35fd9157fda8b0194bcfcd0d88ea8521a4fb5dd53d33dddc` |
| LiberationSans-Italic.ttf | 162036 | `832b4406dbef23628800d3aaad21048534ac84d7e3ad955be83b8172ed8ef512` |
| LiberationSans-BoldItalic.ttf | 135124 | `a224075ac17495ad0a3af3bc0a419ac0704a8b3fd1095456201fb9b095fc281d` |

## Upstream evidence and remaining discrepancy

[PDF.js's pinned font README](https://raw.githubusercontent.com/mozilla/pdf.js/v6.3.289/external/standard_fonts/README.md)
identifies these as Liberation Sans 1.07.4 under GPLv2 with the Liberation font
exception. The shipped full exception/GPL text is preserved; these files are not
relabeled OFL. PDF.js also warns that glyph order is coupled to its width/scale
tables, so substituting another release is not a harmless packaging change.

The [Liberation 1.7 upstream repository](https://github.com/liberationfonts/liberation-1.7-fonts)
documents SFD sources and a FontForge/Make build. The following named archives were
downloaded from its release server for inspection (no build scripts were executed):

- [Source 1.07.4](https://releases.pagure.org/liberation-fonts/liberation-fonts-1.07.4.tar.gz),
  SHA-256 `ad98b7498dc2992f7f0868f79b65ce4a720a3acdb63ab3f1f1cb6881117a5406`.
  Contains 26 files, including all four Sans SFD sources, Makefile, conversion
  scripts, README, AUTHORS, License.txt and COPYING. Makefile says version 1.07.4.
- [TTF 1.07.4](https://releases.pagure.org/liberation-fonts/liberation-fonts-ttf-1.07.4.tar.gz),
  SHA-256 `61a7e2b6742a43c73e8762cdfeaf6dfcf9abdd2cfa0b099a9854d69bc4cfee5c`.

**All four PDF.js TTFs differ byte-for-byte from the corresponding TTFs in that
upstream binary archive.** The Regular file retrieved directly from the pinned
PDF.js source tag matches the installed/shipped Regular file, so the discrepancy
is not a OneWord copy/build transformation. The legacy upstream README's displayed
1.07.4 binary link currently points to a different release; the inspection used
the explicit `liberation-fonts-ttf-1.07.4.tar.gz` filename above.

Name tables in both sets say version 1.07.4. All four PDF.js files contain 681
glyphs; the named upstream archive has 682 in Regular/Bold and 687 in
Italic/BoldItalic. This is more than a timestamp-only byte difference. It does
not by itself identify which transformation or source revision produced them.

A binary mismatch alone does not prove noncompliance, nor does the matching
version label prove the exact preferred-source relationship. Ask upstream/a
qualified reviewer to identify the modifications/build provenance and the
complete preferred source required for these exact files. No claim is made that
OneWord's git archive or a link to a different font release resolves this.

## Distribution procedure after review

1. Confirm the exact source/binary mapping and retain any patches/build scripts
   needed for the shipped files, together with the applicable license/exception.
2. Preserve the reviewed source archive and its verified checksum in the release
   materials. Under the chosen compliant distribution method, make it accessible
   alongside the distributed fonts and provide clear source directions. Do not
   rely solely on a moving repository or an unverified upstream download link.
3. Record the actual accessible URL and review evidence in `liberationSource` in
   [release-metadata.json](../release-metadata.json), then run `npm run release:check`.
   That local check is a guard against missing declarations, not a legal opinion.

The source/binary downloads and comparison JSON are local ignored evidence under
`.tools/rc0-liberation-*` and `artifacts/rc0-font-archives.json`; they are not a
published source offer or approved release artifacts. Normal local builds keep
the existing font files and notices. Public release remains blocked on this review.
