export type Mode = 'words' | 'sentence'
export interface ReaderSettings { mode: Mode; words: number; wpm: number; punctuation: boolean }
export interface Chunk { text: string; start: number; end: number; units: number }
export const defaultSettings: ReaderSettings = { mode: 'words', words: 1, wpm: 300, punctuation: true }

export function validateSettings(settings: ReaderSettings): ReaderSettings {
  if (!Number.isInteger(settings.words) || settings.words < 1 || settings.words > 100) throw new Error('Số từ mỗi lượt phải từ 1 đến 100.')
  if (!Number.isFinite(settings.wpm) || settings.wpm < 30 || settings.wpm > 1200) throw new Error('Tốc độ phải từ 30 đến 1.200 WPM.')
  return { ...settings }
}

export function segment(text: string, settings: ReaderSettings): Chunk[] {
  validateSettings(settings)
  const chunks: Chunk[] = []
  if (settings.mode === 'sentence') {
    const sentences = new Intl.Segmenter('vi', { granularity: 'sentence' })
    for (const part of sentences.segment(text)) {
      const leading = part.segment.length - part.segment.trimStart().length
      const value = part.segment.trim()
      if (value) chunks.push({ text: value, start: part.index + leading, end: part.index + leading + value.length, units: value.match(/\S+/gu)!.length })
    }
  } else {
    const words = [...text.matchAll(/\S+/gu)]
    for (let i = 0; i < words.length; i += settings.words) {
      const group = words.slice(i, i + settings.words)
      const start = group[0].index!
      const last = group[group.length - 1]
      const end = last.index! + last[0].length
      chunks.push({ text: text.slice(start, end), start, end, units: group.length })
    }
  }
  return chunks
}

export function duration(chunk: Chunk, settings: ReaderSettings): number {
  const beat = 60_000 / settings.wpm
  const end = chunk.text.replace(/[\s”’"')\]]+$/gu, '')
  const pause = !settings.punctuation ? 0 : /[.!?…]$/u.test(end) ? beat : /[,;:]$/u.test(end) ? beat * 0.5 : 0
  return chunk.units * beat + pause
}

export interface Clock {
  now(): number
  schedule(callback: () => void, milliseconds: number): ReturnType<typeof setTimeout>
  cancel(id: ReturnType<typeof setTimeout>): void
}
const realClock: Clock = {
  now: () => performance.now(),
  schedule: (callback, ms) => setTimeout(callback, ms),
  cancel: (id) => clearTimeout(id),
}
export interface ReaderSnapshot { chunks: readonly Chunk[]; index: number; status: 'empty' | 'ready' | 'playing' | 'paused' | 'completed' }

/** A single timer advances one chunk. Late callbacks never fast-forward. */
export class ReaderEngine {
  private snapshot: ReaderSnapshot = { chunks: [], index: 0, status: 'empty' }
  private settings = defaultSettings
  private listeners = new Set<() => void>()
  private timer?: ReturnType<typeof setTimeout>
  private deadline = 0
  private remaining = 0
  constructor(private clock: Clock = realClock) {}
  getSnapshot = () => this.snapshot
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  private emit(change: Partial<ReaderSnapshot>) {
    this.snapshot = { ...this.snapshot, ...change }
    this.listeners.forEach((listener) => listener())
  }
  private clear() { if (this.timer !== undefined) this.clock.cancel(this.timer); this.timer = undefined }
  load(text: string, settings: ReaderSettings, offset = 0) {
    const next = validateSettings(settings)
    const chunks = segment(text, next)
    this.clear()
    this.settings = next
    const found = chunks.findIndex((chunk) => chunk.end > offset)
    this.remaining = 0
    this.emit({ chunks, index: found < 0 ? 0 : found, status: chunks.length ? 'ready' : 'empty' })
  }
  play() {
    if (!this.snapshot.chunks.length || this.snapshot.status === 'playing') return
    if (this.snapshot.status === 'completed') { this.remaining = 0; this.emit({ index: 0 }) }
    this.emit({ status: 'playing' })
    this.arm()
  }
  private arm() {
    const ms = this.remaining || duration(this.snapshot.chunks[this.snapshot.index], this.settings)
    this.remaining = 0
    this.deadline = this.clock.now() + ms
    this.timer = this.clock.schedule(() => {
      this.timer = undefined
      if (this.snapshot.index === this.snapshot.chunks.length - 1) { this.emit({ status: 'completed' }); return }
      this.emit({ index: this.snapshot.index + 1 })
      this.arm()
    }, ms)
  }
  pause() {
    if (this.snapshot.status !== 'playing') return
    this.remaining = Math.max(1, this.deadline - this.clock.now())
    this.clear()
    this.emit({ status: 'paused' })
  }
  toggle() { if (this.snapshot.status === 'playing') this.pause(); else this.play() }
  seek(index: number) {
    if (!this.snapshot.chunks.length) return
    this.clear(); this.remaining = 0
    this.emit({ index: Math.max(0, Math.min(index, this.snapshot.chunks.length - 1)), status: 'paused' })
  }
  step(delta: number) { this.seek(this.snapshot.index + delta) }
  dispose() { this.clear(); this.listeners.clear() }
}
