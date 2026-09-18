import { defineConfig, devices } from '@playwright/test'
import { mkdirSync } from 'node:fs'

// A fresh clone has no ignored artifact directory; evidence writers need it.
mkdirSync('artifacts', { recursive: true })

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:4173', launchOptions: { chromiumSandbox: true }, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'chromium', testIgnore: 'hidden.spec.ts', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1100 } } },
    { name: 'native-visibility', testMatch: 'hidden.spec.ts', use: { trace: 'off', screenshot: 'off' } },
  ],
  webServer: { command: 'node scripts/serve-built.mjs', url: 'http://127.0.0.1:4173', reuseExistingServer: false },
})
