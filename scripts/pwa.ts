import { createHash } from 'node:crypto'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { resolve, relative } from 'node:path'
import type { Plugin } from 'vite'

export function localPwa(): Plugin {
  let output = ''
  return {
    name: 'oneword-local-pwa', apply: 'build',
    configResolved(config) { output = resolve(config.root, config.build.outDir) },
    async closeBundle() {
      async function collect(directory: string): Promise<string[]> {
        const entries = await readdir(directory, { withFileTypes: true })
        return (await Promise.all(entries.map(e => e.isDirectory() ? collect(resolve(directory, e.name)) : [resolve(directory, e.name)]))).flat()
      }
      const paths = (await collect(output)).filter(p => !p.endsWith('sw.js')).sort()
      const assets = await Promise.all(paths.map(async path => ({ url: '/' + relative(output, path).replaceAll('\\', '/'), integrity: 'sha256-' + createHash('sha256').update(await readFile(path)).digest('base64') })))
      const template = await readFile(resolve('src/offline/worker.js'), 'utf8')
      // A worker-only change must never install into an active worker's cache.
      const version = createHash('sha256').update(template).update(JSON.stringify(assets)).digest('hex').slice(0, 20)
      await writeFile(resolve(output, 'sw.js'), template.replace('__BUILD__', JSON.stringify(version)).replace('__ASSETS__', JSON.stringify(assets)))
    },
  }
}
