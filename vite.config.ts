import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react(), {
    name: 'development-csp',
    apply: 'serve',
    // Vite's development React preamble needs inline scripts. The production
    // build retains the restrictive policy from index.html.
    transformIndexHtml: (html) => html.replace(/\s*<meta http-equiv="Content-Security-Policy"[^>]+>/, ''),
  }],
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
})
