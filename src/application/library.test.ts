import { afterEach, describe, expect, it, vi } from 'vitest'
import { emptyLibrary, Persistence, type ReaderStorage } from './library'

afterEach(() => vi.useRealTimers())
function harness() {
  const storage: ReaderStorage = { read: vi.fn(async () => ({ data: emptyLibrary(), generation: 0 })), save: vi.fn(async (_data, generation) => generation + 1), close: vi.fn() }
  const report = vi.fn(), persistence = new Persistence(storage, report)
  return { storage, report, persistence }
}
describe('persistence checkpoints and failures', () => {
  it('flushes a document switch arriving while an empty flush promise is settling', async () => {
    const { persistence, storage, report } = harness(); await persistence.open()
    const idle = persistence.flush()
    const data = { ...emptyLibrary(), draft: { documentId: null, text: 'new document' } }
    persistence.update(data, true)
    await idle; await persistence.flush()
    expect(storage.save).toHaveBeenCalledWith(data, 0)
    expect(report).toHaveBeenLastCalledWith('saved'); persistence.dispose()
  })
  it('bounds writes during continuous changes and flushes the latest snapshot', async () => {
    vi.useFakeTimers(); const { persistence, storage } = harness(); await persistence.open()
    for (let i = 0; i < 10; i++) { persistence.update({ ...emptyLibrary(), draft: { documentId: null, text: String(i) } }); await vi.advanceTimersByTimeAsync(100) }
    expect(storage.save).toHaveBeenCalledTimes(1)
    expect(vi.mocked(storage.save).mock.calls[0][0].draft?.text).toBe('9')
    persistence.update(emptyLibrary()); await persistence.flush()
    expect(storage.save).toHaveBeenCalledTimes(2); persistence.dispose()
  })
  it('never reports saved on failure; retains data for retry', async () => {
    const { persistence, storage, report } = harness(); await persistence.open()
    vi.mocked(storage.save).mockRejectedValueOnce(new DOMException('full', 'QuotaExceededError'))
    const data = { ...emptyLibrary(), draft: { documentId: null, text: 'keep in memory' } }
    persistence.update(data); expect(await persistence.flush()).toBe(false)
    expect(report).not.toHaveBeenCalledWith('saved'); expect(report).toHaveBeenLastCalledWith('error', expect.any(String))
    expect(await persistence.retry()).toBe(true)
    expect(vi.mocked(storage.save).mock.calls[1][0]).toEqual(data); persistence.dispose()
  })
  it('keeps a session usable when opening IndexedDB fails and never overwrites unread data', async () => {
    const { persistence, storage, report } = harness()
    vi.mocked(storage.read).mockRejectedValue(new Error('unavailable'))
    expect(await persistence.open()).toEqual(emptyLibrary())
    persistence.update(emptyLibrary()); expect(await persistence.retry()).toBe(false)
    expect(storage.save).not.toHaveBeenCalled(); expect(report).toHaveBeenCalledWith('error', expect.any(String)); persistence.dispose()
  })
  it('propagates restore transaction failure instead of publishing restored state', async () => {
    const { persistence, storage } = harness(); await persistence.open()
    vi.mocked(storage.save).mockRejectedValueOnce(new Error('abort'))
    await expect(persistence.restore(emptyLibrary())).rejects.toThrow('abort'); persistence.dispose()
  })
})
