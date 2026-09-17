import { chromium, expect, test as base, type Browser, type Page } from '@playwright/test'
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'

// Default Playwright pages behave as active pages. Use a fresh, ordinary headed
// Chromium default context, without Playwright's focus/media overrides. This is
// the public connectOverCDP/noDefaults API, not an override of document.hidden.
const test = base.extend<{ nativePage: Page }>({
  nativePage: async ({ baseURL }, use, testInfo) => {
    const profile = testInfo.outputPath('native-profile')
    await mkdir(profile, { recursive: true })
    const child = spawn(chromium.executablePath(), [
      '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1',
      `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', 'about:blank',
    ], { stdio: ['ignore', 'ignore', 'pipe'] })
    let browser: Browser | undefined
    try {
      const endpoint = await new Promise<string>((resolve, reject) => {
        let output = ''
        const timer = setTimeout(() => reject(new Error('[NATIVE_ENVIRONMENT_UNSUPPORTED] Headed Chromium did not expose CDP within 30s. Check DISPLAY/WSLg.')), 30_000)
        child.once('error', error => { clearTimeout(timer); reject(error) })
        child.once('exit', code => { clearTimeout(timer); reject(new Error(`Native Chromium exited before connection: ${code}`)) })
        child.stderr.on('data', data => {
          output = (output + data.toString()).slice(-8192)
          const match = output.match(/DevTools listening on (ws:\/\/\S+)/)
          if (match) { clearTimeout(timer); resolve(match[1]) }
        })
      })
      browser = await chromium.connectOverCDP(endpoint, { noDefaults: true })
      const page = browser.contexts()[0].pages()[0]
      if (!baseURL) throw new Error('Missing baseURL')
      await use(page)
    } finally {
      // Close only the fresh test browser; never attach to a personal profile.
      if (browser?.isConnected()) {
        const session = await browser.newBrowserCDPSession()
        await session.send('Browser.close').catch(() => undefined)
        await browser.close()
      }
      child.kill()
    }
  },
})

// A fresh headed profile plus real hidden/visible waits can exceed the default
// 30s under WSL filesystem load. Keep all state/timing assertions unchanged.
test.setTimeout(60_000)

interface Observation {
  at: number
  visibility: DocumentVisibilityState
  hidden: boolean
  focused: boolean
  chunk: string | null
  status: string | null
  type?: string
  trusted?: boolean
}
type EvidenceWindow = Window & { nativeVisibilityEvents: Observation[] }
const observe = (page: Page) => page.evaluate(() => ({
  at: performance.now(), visibility: document.visibilityState, hidden: document.hidden,
  focused: document.hasFocus(), chunk: document.querySelector('[data-testid="current-chunk"]')?.textContent ?? null,
  status: document.querySelector('.stage-status')?.textContent ?? null,
}))

test('real hidden tab pauses and returning never catches up; manual resume continues', async ({ nativePage: page, baseURL }, testInfo) => {
  const evidence: Record<string, unknown> = {
    browser: page.context().browser()!.version(), mode: 'headed Chromium, fresh default context, CDP noDefaults',
    display: process.env.DISPLAY, wpm: 30, wordCount: 120, wordsPerChunk: 1,
  }
  try {
    const other = await page.context().newPage()
    await other.goto('about:blank')
    await test.step('Native environment capability, independent of application', async () => {
      await page.bringToFront()
      await expect.poll(() => page.evaluate(() => document.visibilityState)).toBe('visible')
      await other.bringToFront()
      // Keep this a failing gate when unsupported; never skip or force-pass it.
      await expect.poll(() => page.evaluate(() => document.visibilityState), {
        message: '[NATIVE_ENVIRONMENT_UNSUPPORTED] A blank tab must actually become hidden before testing the reader',
      }).toBe('hidden')
      evidence.blankTabHidden = await observe(page)
    })
    await page.bringToFront()
    await page.goto(baseURL!)
    await page.getByLabel('Nội dung văn bản').fill(Array.from({ length: 120 }, (_, i) => `từ${i}`).join(' '))
    await page.getByRole('button', { name: 'Dùng văn bản' }).click()
    await page.getByLabel('Tốc độ', { exact: true }).fill('30')
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Tiến một lượt' }).click()
    await page.evaluate(() => {
      const target = window as unknown as EvidenceWindow
      target.nativeVisibilityEvents = []
      for (const type of ['visibilitychange', 'blur', 'focus']) {
        (type === 'visibilitychange' ? document : window).addEventListener(type, event => {
          queueMicrotask(() => target.nativeVisibilityEvents.push({
            type, trusted: event.isTrusted, at: performance.now(), visibility: document.visibilityState,
            hidden: document.hidden, focused: document.hasFocus(),
            chunk: document.querySelector('[data-testid="current-chunk"]')?.textContent ?? null,
            status: document.querySelector('.stage-status')?.textContent ?? null,
          }))
        })
      }
    })
    await page.getByRole('button', { name: 'Đọc tiếp', exact: true }).click()
    await expect(page.locator('.stage-status')).toHaveText('Đang đọc')
    evidence.before = await observe(page)
    const beforeWord = await page.getByTestId('current-chunk').textContent()
    await other.bringToFront()
    await expect.poll(() => page.evaluate(() => document.visibilityState)).toBe('hidden')
    await expect(page.locator('.stage-status')).toHaveText('Đã tạm dừng')
    await expect(page.getByTestId('current-chunk')).toHaveText(beforeWord!)
    evidence.hidden = await observe(page)
    // Real time, longer than two 2-second chunks. No Playwright clock installed.
    await page.waitForTimeout(4500)
    await expect(page.getByTestId('current-chunk')).toHaveText(beforeWord!)
    evidence.afterHiddenWait = await observe(page)
    await page.bringToFront()
    await expect.poll(() => page.evaluate(() => document.visibilityState)).toBe('visible')
    await page.waitForTimeout(2200)
    await expect(page.getByTestId('current-chunk')).toHaveText(beforeWord!)
    await expect(page.getByRole('button', { name: 'Đọc tiếp', exact: true })).toBeEnabled()
    evidence.returned = await observe(page)
    await page.getByRole('button', { name: 'Đọc tiếp', exact: true }).click()
    const expectedNext = `từ${Number(beforeWord!.slice(2)) + 1}`
    await expect(page.getByTestId('current-chunk')).toHaveText(expectedNext)
    await expect(page.locator('.stage-status')).toHaveText('Đang đọc')
    await page.getByRole('button', { name: 'Tạm dừng', exact: true }).click()
    evidence.resumed = await observe(page)
    const events = await page.evaluate(() => (window as unknown as EvidenceWindow).nativeVisibilityEvents)
    evidence.events = events
    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'visibilitychange', trusted: true, visibility: 'hidden', hidden: true }),
      expect.objectContaining({ type: 'visibilitychange', trusted: true, visibility: 'visible', hidden: false }),
    ]))
    // Capture only after the visibility assertions, so screenshots cannot affect them.
    await page.screenshot({ path: 'artifacts/native-visibility-returned.png' })
  } finally {
    evidence.final = await observe(page).catch(() => null)
    const json = JSON.stringify(evidence, null, 2)
    await writeFile('artifacts/native-visibility.json', json)
    await testInfo.attach('native-visibility-evidence', { body: json, contentType: 'application/json' })
  }
})
