import type { Page } from '@playwright/test'
import type { LibraryData } from '../../src/application/library'

export async function seedDatabase(page: Page, data: LibraryData, era = 5, origin = '') {
  await page.goto(`${origin}/favicon.svg`)
  await page.evaluate(async ({ data, era }) => {
    await new Promise<void>((resolve, reject) => { const r = indexedDB.deleteDatabase('oneword-reader'); r.onsuccess = () => resolve(); r.onerror = () => reject(r.error); r.onblocked = () => reject(new Error('Test database blocked')) })
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open('oneword-reader', era * 10)
      r.onupgradeneeded = () => { for (const name of ['documents', 'positions', 'settings', 'meta', ...(era >= 3 ? ['packs'] : []), ...(era >= 4 ? ['review'] : []), ...(era >= 5 ? ['quiz'] : [])]) r.result.createObjectStore(name, { keyPath: name === 'positions' ? 'documentId' : 'id' }) }
      r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error)
    })
    const tx = db.transaction([...db.objectStoreNames], 'readwrite')
    for (const doc of data.documents) tx.objectStore('documents').put(doc)
    for (const position of data.positions) tx.objectStore('positions').put(position)
    tx.objectStore('settings').put({ id: 'reader', ...data.preferences })
    tx.objectStore('meta').put({ id: 'library', schemaVersion: era, generation: 7, activeDocumentId: data.activeDocumentId, draft: data.draft })
    if (era >= 3) for (const pack of data.packs) tx.objectStore('packs').put(pack)
    if (era >= 4) tx.objectStore('review').put({ id: 'review', generation: 3, data: data.review })
    if (era >= 5) tx.objectStore('quiz').put({ id: 'quiz', generation: 4, attempts: data.quizAttempts, activeAttemptId: data.quizActiveAttemptId })
    await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error) }); db.close()
  }, { data, era })
}
export async function databaseSnapshot(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const r = indexedDB.open('oneword-reader'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error) })
    const records: Record<string, unknown[]> = {}
    try { for (const name of db.objectStoreNames) records[name] = await new Promise<unknown[]>((resolve, reject) => { const r = db.transaction(name).objectStore(name).getAll(); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error) }); return { version: db.version, records } }
    finally { db.close() }
  })
}

// Keep a real transaction alive so app writes queue behind it until released.
export async function holdDatabaseWrites(page: Page) {
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const r = indexedDB.open('oneword-reader'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error) })
    const tx = db.transaction([...db.objectStoreNames], 'readwrite')
    let held = true
    const complete = new Promise<void>((resolve, reject) => { tx.oncomplete = () => { db.close(); resolve() }; tx.onabort = () => { db.close(); reject(tx.error) } })
    const pump = () => { const request = tx.objectStore('settings').get('reader'); request.onsuccess = () => { if (held) pump() } }
    const target = window as Window & { releaseTestWrites?: () => Promise<void> }
    target.releaseTestWrites = async () => { held = false; await complete; delete target.releaseTestWrites }
    pump()
  })
  return () => page.evaluate(async () => { await (window as Window & { releaseTestWrites?: () => Promise<void> }).releaseTestWrites?.() })
}
