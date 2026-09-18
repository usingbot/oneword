import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { localPwa } from './scripts/pwa.ts'
import { licenseAssets, licenseContent } from './scripts/license-assets.mjs'

// Ship only text-extraction resources, with their upstream notices. No CDN.
async function pdfAssets() {
  const files = new Map<string, Buffer>()
  for (const directory of ['cmaps', 'standard_fonts']) {
    const root = resolve('node_modules/pdfjs-dist', directory)
    for (const name of await readdir(root)) files.set(`pdf-assets/${directory}/${name}`, await readFile(resolve(root, name)))
  }
  files.set('pdf-assets/PDFJS-LICENSE', await readFile(resolve('node_modules/pdfjs-dist/LICENSE')))
  return files
}

export default defineConfig({
  plugins: [react(), localPwa(), {
    name: 'release-license-notices', apply: 'build',
    async generateBundle() {
      for (const [path, fileName] of licenseAssets) {
        this.emitFile({ type: 'asset', fileName, source: await licenseContent(path) })
      }
    },
  }, {
    name: 'build-label', apply: 'build',
    transformIndexHtml: html => html.replace('</head>', `<meta name="oneword-build" content="${(process.env.ONEWORD_BUILD_LABEL ?? 'production').replace(/[^a-zA-Z0-9._-]/g, '')}" /></head>`),
  }, {
    name: 'local-pdf-assets',
    async generateBundle() { for (const [fileName, source] of await pdfAssets()) this.emitFile({ type: 'asset', fileName, source }) },
    async configureServer(server) {
      const files = await pdfAssets()
      server.middlewares.use((req, res, next) => {
        const data = files.get((req.url ?? '').replace(/^\//u, '').split('?')[0])
        if (!data) { next(); return }
        res.setHeader('Content-Type', 'application/octet-stream'); res.end(data)
      })
    },
  }, {
    name: 'development-csp',
    apply: 'serve',
    // Vite's development React preamble needs inline scripts. The production
    // build retains the restrictive policy from index.html.
    transformIndexHtml: (html) => html.replace(/\s*<meta http-equiv="Content-Security-Policy"[^>]+>/, ''),
  }],
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
})
