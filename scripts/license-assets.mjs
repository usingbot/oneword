// Deliberately limited to licenses for code/resources actually shipped to browsers.
export const licenseAssets = [
  ['LICENSE', 'licenses/ONEWORD-AGPL-3.0.txt'],
  ['COPYRIGHT', 'licenses/ONEWORD-COPYRIGHT.txt'],
  ['THIRD-PARTY-NOTICES.md', 'licenses/THIRD-PARTY-NOTICES.txt'],
  ...['react', 'react-dom', 'scheduler', 'dexie', 'ts-fsrs'].map(name => [
    `node_modules/${name}/LICENSE`, `licenses/${name}-LICENSE.txt`,
  ]),
  ['node_modules/dexie/NOTICE', 'licenses/dexie-NOTICE.txt'],
]

export const existingPdfNotices = [
  ['node_modules/pdfjs-dist/LICENSE', 'pdf-assets/PDFJS-LICENSE'],
  ['node_modules/pdfjs-dist/cmaps/LICENSE', 'pdf-assets/cmaps/LICENSE'],
  ...['LICENSE_FOXIT', 'LICENSE_LIBERATION'].map(name => [
    `node_modules/pdfjs-dist/standard_fonts/${name}`, `pdf-assets/standard_fonts/${name}`,
  ]),
]
