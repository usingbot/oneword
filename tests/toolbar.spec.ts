import { expect, test } from '@playwright/test'
import { writeFile } from 'node:fs/promises'

// Headless isolates the inactivity requirement from the shared desktop's real
// pointer. Fullscreen, CSS transitions, keyboard focus and timers stay real.
test.use({ headless: true })
for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`fullscreen toolbar inactivity, timer reset and keyboard focus (${reducedMotion})`, async ({ page }, info) => {
    await page.emulateMedia({ reducedMotion })
    await page.goto('/')
    await page.getByLabel('Nội dung văn bản').fill(Array.from({ length: 120 }, (_, i) => `từ${i}`).join(' '))
    await page.getByRole('button', { name: 'Dùng văn bản' }).click()
    await page.getByLabel('Tốc độ', { exact: true }).fill('30')
    await page.getByRole('button', { name: 'Mở toàn màn hình' }).click()
    const stage = page.locator('.reader-stage'), toolbar = page.locator('.stage-toolbar')
    await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true)
    await expect(stage).toBeFocused()
    await stage.press('Space')
    await expect(page.getByRole('button', { name: 'Tạm dừng', exact: true })).toBeVisible()
    const states: unknown[] = []
    const capture = async (label: string) => states.push(await toolbar.evaluate((element, label) => ({
      label, at: performance.now(), opacity: getComputedStyle(element).opacity,
      focused: element.matches(':focus-within'), hovered: element.matches(':hover'),
      fullscreen: !!document.fullscreenElement,
      playing: document.querySelector('.play-button')?.getAttribute('aria-label') === 'Tạm dừng',
    }), label))
    await page.mouse.move(5, 5)
    await expect(toolbar).toHaveCSS('opacity', '1')
    await page.waitForTimeout(1200)
    await expect(toolbar).toHaveCSS('opacity', '1')
    await page.mouse.move(10, 10)
    await capture('interaction resets the hide timer')
    // The first timer would have expired; the second must still keep controls up.
    await page.waitForTimeout(1300)
    await expect(toolbar).toHaveCSS('opacity', '1')
    expect(await toolbar.evaluate(element => element.matches(':hover, :focus-within'))).toBe(false)
    await expect(toolbar).toHaveCSS('opacity', '0', { timeout: 5000 })
    await expect(page.getByRole('button', { name: 'Tạm dừng', exact: true })).toHaveCount(1)
    await capture('inactivity hides the toolbar while still playing')
    await page.screenshot({ path: `artifacts/rc0-toolbar-hidden-${reducedMotion}.png` })
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Thoát toàn màn hình' })).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Lùi một lượt' })).toBeFocused()
    await page.waitForTimeout(2700)
    await expect(stage).not.toHaveClass(/controls-visible/)
    await expect(toolbar).toHaveCSS('opacity', '1')
    await capture('keyboard focus keeps controls visible after the timer expires')
    await page.screenshot({ path: `artifacts/rc0-toolbar-focused-${reducedMotion}.png` })
    await page.keyboard.press('Shift+Tab')
    await expect(page.getByRole('button', { name: 'Thoát toàn màn hình' })).toBeFocused()
    await expect(toolbar).toHaveCSS('opacity', '0', { timeout: 5000 })
    await capture('leaving toolbar focus permits auto-hide again')
    await page.keyboard.press('Escape')
    await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true)
    await expect(stage).not.toHaveClass(/is-focus/)
    const evidence = JSON.stringify({ reducedMotion, states }, null, 2)
    await writeFile(`artifacts/rc0-toolbar-${reducedMotion}.json`, evidence)
    await info.attach('toolbar-inactivity-and-accessibility', { body: evidence, contentType: 'application/json' })
  })
}
