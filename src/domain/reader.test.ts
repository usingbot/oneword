import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultSettings, duration, ReaderEngine, segment } from './reader'

describe('segmentation and timing', () => {
  it.each([[1, 200], [3, 600], [5, 1000]])('%i units at 300 WPM take %i ms', (words, ms) => {
    const settings = { ...defaultSettings, words, punctuation: false }
    const chunks = segment('Một hai ba bốn năm', settings)
    expect(duration(chunks[0], settings)).toBe(ms)
  })
  it('preserves Unicode, hyphens, line breaks, and source offsets', () => {
    const text = '  well-being x-ray -4 A-B\ninforma-\ntion tiếng Việt 👋  '
    const chunks = segment(text, { ...defaultSettings, words: 3 })
    expect(chunks.every((c) => c.text === text.slice(c.start, c.end))).toBe(true)
    expect(chunks[0].text).toBe('well-being x-ray -4')
    expect(chunks[1].text).toBe('A-B\ninforma-\ntion')
    expect(chunks[2].text).toBe('tiếng Việt 👋')
  })
  it('handles empty text, a single word, and a shorter last group', () => {
    expect(segment(' \n\t', defaultSettings)).toEqual([])
    expect(segment('xin', defaultSettings)[0].units).toBe(1)
    const settings = { ...defaultSettings, words: 3, punctuation: false }
    const chunks = segment('a b c d', settings)
    expect(duration(chunks[1], settings)).toBe(200)
  })
  it('times full sentences by their unit count, including closing quotes', () => {
    const settings = { ...defaultSettings, mode: 'sentence' as const }
    const chunks = segment('“Xin chào bạn!” Hẹn gặp lại.', settings)
    expect(chunks).toHaveLength(2)
    expect(chunks[0].units).toBe(3)
    expect(duration(chunks[0], settings)).toBe(800)
    expect(duration({ text: 'xin,', start: 0, end: 4, units: 1 }, settings)).toBe(300)
  })
  it('rejects invalid numeric settings', () => {
    expect(() => segment('a', { ...defaultSettings, words: 0 })).toThrow()
    expect(() => segment('a', { ...defaultSettings, wpm: NaN })).toThrow()
  })
})

describe('ReaderEngine', () => {
  let engine: ReaderEngine
  beforeEach(() => { vi.useFakeTimers(); engine = new ReaderEngine() })
  afterEach(() => { engine.dispose(); vi.useRealTimers() })
  it('keeps the final word visible for its full duration before completing', () => {
    engine.load('a b', { ...defaultSettings, punctuation: false })
    engine.play(); engine.play()
    vi.advanceTimersByTime(199); expect(engine.getSnapshot().index).toBe(0)
    vi.advanceTimersByTime(1); expect(engine.getSnapshot().index).toBe(1)
    expect(engine.getSnapshot().status).toBe('playing')
    vi.advanceTimersByTime(200); expect(engine.getSnapshot().status).toBe('completed')
    expect(vi.getTimerCount()).toBe(0)
    engine.play(); expect(engine.getSnapshot().index).toBe(0)
  })
  it('pauses with remaining time and never catches up after a long absence', () => {
    engine.load('a b c', { ...defaultSettings, punctuation: false })
    engine.play(); vi.advanceTimersByTime(75); engine.pause()
    expect(engine.getSnapshot().status).toBe('paused')
    expect(vi.getTimerCount()).toBe(0)
    engine.pause() // Duplicate blur/hidden notifications must not reset remaining time.
    vi.advanceTimersByTime(60_000); expect(engine.getSnapshot().index).toBe(0)
    expect(engine.getSnapshot().status).toBe('paused')
    engine.play(); vi.advanceTimersByTime(124); expect(engine.getSnapshot().index).toBe(0)
    vi.advanceTimersByTime(1); expect(engine.getSnapshot().index).toBe(1)
  })
  it('steps while paused, clamps boundaries, and preserves offset on regrouping', () => {
    engine.load('one two three four', defaultSettings)
    engine.play(); engine.step(2)
    expect(engine.getSnapshot().status).toBe('paused')
    engine.load('one two three four', { ...defaultSettings, words: 3 }, engine.getSnapshot().chunks[2].start)
    expect(engine.getSnapshot().index).toBe(0)
    engine.step(-9); expect(engine.getSnapshot().index).toBe(0)
    engine.step(99); expect(engine.getSnapshot().index).toBe(1)
    expect(vi.getTimerCount()).toBe(0)
  })
  it('cleans timers on document replacement and disposal', () => {
    engine.load('a b c', defaultSettings); engine.play()
    engine.load('', defaultSettings); engine.play()
    expect(engine.getSnapshot().status).toBe('empty')
    expect(vi.getTimerCount()).toBe(0)
    engine.load('a b', defaultSettings); engine.play(); engine.dispose()
    expect(vi.getTimerCount()).toBe(0)
  })
  it('advances only once when a callback is delayed', () => {
    let callback = () => {}
    const delayed = new ReaderEngine({ now: () => 90_000, schedule: (fn) => { callback = fn; return 1 as unknown as ReturnType<typeof setTimeout> }, cancel: () => {} })
    delayed.load('a b c d e', defaultSettings); delayed.play(); callback()
    expect(delayed.getSnapshot().index).toBe(1)
    delayed.dispose()
  })
})
