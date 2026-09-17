import { defineConfig, devices } from '@playwright/test'
import primary from './playwright.config'

export default defineConfig({
  ...primary,
  outputDir: 'test-results/firefox',
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report/firefox' }]],
  projects: [{ name: 'firefox', testMatch: 'compatibility.spec.ts', use: { ...devices['Desktop Firefox'], launchOptions: {} } }],
})
