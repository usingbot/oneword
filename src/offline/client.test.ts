import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { registerOffline, type OfflineState } from './client'

class Worker extends EventTarget {
  state: ServiceWorkerState = 'installing'
  scriptURL = 'http://localhost/sw.js'
  transition(state: ServiceWorkerState) { this.state = state; this.dispatchEvent(new Event('statechange')) }
}
class Registration extends EventTarget {
  installing: Worker | null = null
  waiting: Worker | null = null
  active: Worker | null = null
  update = vi.fn(async () => undefined)
}
const deferred = <T,>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => { resolve = done })
  return { promise, resolve }
}

describe('offline readiness lifecycle', () => {
  let reg: Registration, worker: Worker, container: EventTarget & { controller: Worker | null; register: ReturnType<typeof vi.fn>; ready: Promise<Registration> }
  let registered: ReturnType<typeof deferred<Registration>>, ready: ReturnType<typeof deferred<Registration>>, states: OfflineState[]
  const flush = async () => { await Promise.resolve(); await Promise.resolve() }
  beforeEach(() => {
    reg = new Registration(); worker = new Worker(); reg.installing = worker
    registered = deferred<Registration>(); ready = deferred<Registration>(); states = []
    container = Object.assign(new EventTarget(), { controller: null as Worker | null, register: vi.fn(() => registered.promise), ready: ready.promise })
    vi.stubGlobal('navigator', { serviceWorker: container, onLine: true })
    vi.stubGlobal('window', Object.assign(new EventTarget(), { isSecureContext: true }))
    vi.stubEnv('PROD', true)
  })
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

  it('registration and an activating ready-promise do not announce offline readiness', async () => {
    const client = registerOffline(state => states.push(state))
    registered.resolve(reg); await flush()
    expect(states.at(-1)?.ready).toBe(false)
    reg.installing = null; reg.active = worker; worker.transition('activating')
    ready.resolve(reg); await flush()
    expect(states.at(-1)?.ready).toBe(false)
    client.dispose()
  })

  for (const order of ['activation-first', 'control-first']) it(`requires both activation and control (${order}) even when updatefound was missed`, async () => {
    const client = registerOffline(state => states.push(state))
    // register() can resolve with an existing installer; no updatefound is replayed.
    registered.resolve(reg); await flush(); reg.installing = null; reg.active = worker
    worker.transition('activating'); ready.resolve(reg); await flush()
    const control = () => { container.controller = worker; container.dispatchEvent(new Event('controllerchange')) }
    const activate = () => worker.transition('activated')
    if (order === 'activation-first') activate(); else control()
    expect(states.at(-1)?.ready).toBe(false)
    if (order === 'activation-first') control(); else activate()
    expect(states.at(-1)?.ready).toBe(true)
    client.dispose()
  })

  it('reads an already activated and controlling worker without requiring a future event', async () => {
    const client = registerOffline(state => states.push(state))
    reg.installing = null; reg.active = worker; worker.transition('activated'); container.controller = worker
    registered.resolve(reg); ready.resolve(reg); await flush()
    expect(states.at(-1)).toMatchObject({ ready: true, waiting: false, error: '' })
    client.dispose()
  })

  it('does not publish after disposal when late state and ready callbacks arrive', async () => {
    const client = registerOffline(state => states.push(state))
    registered.resolve(reg); await flush(); client.dispose()
    const count = states.length
    reg.installing = null; reg.active = worker; container.controller = worker
    worker.transition('activated'); container.dispatchEvent(new Event('controllerchange')); ready.resolve(reg); await flush()
    expect(states).toHaveLength(count)
  })
})
