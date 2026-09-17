export const STUDY_PACK_TYPE = 'oneword-study-pack'
export const MAX_PACK_BYTES = 8 * 1024 * 1024
export const MAX_PACKS = 100
export const MAX_DECKS = 100
export const MAX_CARDS = 5000
export interface CardImage { url: string; alt: string; caption?: string; essential?: boolean }
export interface CardFace { text: string; image?: CardImage }
export interface Deck { id: string; packId: string; title: string; description?: string; order: number }
export interface Flashcard { id: string; deckId: string; front: CardFace; back: CardFace; tags?: readonly string[]; source?: string; order: number; revision: number }
export interface StudyPack {
  type: typeof STUDY_PACK_TYPE
  schemaVersion: 1
  id: string
  title: string
  description: string
  author?: string
  source?: string
  createdAt: string
  updatedAt: string
  decks: readonly Deck[]
  cards: readonly Flashcard[]
}
function fail(message: string): never { throw new Error(message) }
function record(value: unknown, required: string[], optional: string[], label: string) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail(`${label}: cần một đối tượng JSON.`)
  const result = value as Record<string, unknown>
  for (const key of required) if (!Object.hasOwn(result, key)) fail(`${label}: thiếu trường ${key}.`)
  for (const key of Object.keys(result)) if (!required.includes(key) && !optional.includes(key)) fail(`${label}: không hỗ trợ trường ${key}. Chỉ nhận nội dung Study Pack.`)
  return result
}
function text(value: unknown, max: number, label: string, required = false): string {
  if (typeof value !== 'string' || value.length > max || value.includes('\u0000') || required && !value.trim()) return fail(`${label}: cần chuỗi ${required ? 'không rỗng, ' : ''}tối đa ${max} ký tự, không chứa NUL.`)
  return value
}
function id(value: unknown, label: string) {
  const result = text(value, 80, label, true)
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(result)) fail(`${label}: chỉ dùng chữ ASCII, số, dấu chấm, gạch dưới hoặc gạch nối; bắt đầu bằng chữ/số.`)
  return result
}
function integer(value: unknown, min: number, label: string) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > 1_000_000) return fail(`${label}: cần số nguyên từ ${min} đến 1000000.`)
  return value
}
function timestamp(value: unknown, label: string) {
  const result = text(value, 24, label, true)
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/u.test(result) || !Number.isFinite(Date.parse(result)) || new Date(result).toISOString() !== result) fail(`${label}: cần ngày giờ UTC hợp lệ, ví dụ 2026-09-17T00:00:00.000Z.`)
  return result
}
function array(value: unknown, max: number, label: string): unknown[] {
  if (!Array.isArray(value) || value.length > max) return fail(`${label}: cần danh sách tối đa ${max} mục.`)
  return value
}
export function imageUrl(value: unknown): string {
  const input = text(value, 2048, 'URL ảnh', true)
  if (!input.startsWith('https://') || /\s|\\/u.test(input)) fail('URL ảnh phải bắt đầu bằng https://, không có khoảng trắng hoặc dấu gạch chéo ngược.')
  let url: URL
  try { url = new URL(input) } catch (cause) { throw new Error('URL ảnh HTTPS không hợp lệ.', { cause }) }
  if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) fail('URL ảnh phải là HTTPS và không chứa tên đăng nhập/mật khẩu.')
  if (url.href.length > 2048) fail('URL ảnh sau chuẩn hóa vượt giới hạn 2048 ký tự.')
  return url.href
}
function face(value: unknown, label: string): CardFace {
  const data = record(value, ['text'], ['image'], label)
  const content = text(data.text, 10_000, `${label} / chữ`)
  let image: CardImage | undefined
  if (Object.hasOwn(data, 'image')) {
    const img = record(data.image, ['url', 'alt'], ['caption', 'essential'], `${label} / ảnh`)
    if (Object.hasOwn(img, 'essential') && typeof img.essential !== 'boolean') fail(`${label}: essential phải là true hoặc false.`)
    image = { url: imageUrl(img.url), alt: text(img.alt, 1000, 'Mô tả ảnh (alt)', true), ...(Object.hasOwn(img, 'caption') ? { caption: text(img.caption, 2000, 'Chú thích ảnh') } : {}), ...(Object.hasOwn(img, 'essential') ? { essential: img.essential as boolean } : {}) }
  }
  if (!content.trim() && !image) fail(`${label}: cần chữ hoặc ảnh có mô tả.`)
  return { text: content, ...(image ? { image: Object.freeze(image) } : {}) }
}
const byId = <T extends { id: string }>(a: T, b: T) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0
export function validateStudyPack(value: unknown): StudyPack {
  const p = record(value, ['type', 'schemaVersion', 'id', 'title', 'description', 'createdAt', 'updatedAt', 'decks', 'cards'], ['author', 'source'], 'Study Pack')
  if (p.type !== STUDY_PACK_TYPE) fail('Đây không phải OneWord Study Pack. Personal Backup dùng luồng khôi phục riêng.')
  if (p.schemaVersion !== 1) fail('Chưa hỗ trợ phiên bản Study Pack này; hiện chỉ nhận schemaVersion 1.')
  const packId = id(p.id, 'ID pack'), identifiers = new Set([packId])
  const unique = (value: unknown, label: string) => { const result = id(value, label); if (identifiers.has(result)) fail(`ID ${result} bị trùng trong Study Pack.`); identifiers.add(result); return result }
  const decks = array(p.decks, MAX_DECKS, 'Bộ thẻ').map((value, index): Deck => {
    const d = record(value, ['id', 'packId', 'title', 'order'], ['description'], `Bộ thẻ ${index + 1}`)
    const deckId = unique(d.id, 'ID bộ thẻ')
    if (d.packId !== packId) fail(`Bộ thẻ ${deckId} tham chiếu pack ${String(d.packId)}, nhưng pack hiện tại là ${packId}.`)
    return { id: deckId, packId, title: text(d.title, 120, `Tên bộ thẻ ${deckId}`, true), ...(Object.hasOwn(d, 'description') ? { description: text(d.description, 2000, 'Mô tả bộ thẻ') } : {}), order: integer(d.order, 0, 'Thứ tự bộ thẻ') }
  }).sort(byId)
  const deckIds = new Set(decks.map(d => d.id))
  const cards = array(p.cards, MAX_CARDS, 'Thẻ').map((value, index): Flashcard => {
    const c = record(value, ['id', 'deckId', 'front', 'back', 'order', 'revision'], ['tags', 'source'], `Thẻ ${index + 1}`)
    const cardId = unique(c.id, 'ID thẻ'), deckId = id(c.deckId, `Bộ thẻ của ${cardId}`)
    if (!deckIds.has(deckId)) fail(`Thẻ ${cardId} tham chiếu bộ thẻ ${deckId}, nhưng bộ thẻ đó không tồn tại.`)
    let tags: string[] | undefined
    if (Object.hasOwn(c, 'tags')) { tags = array(c.tags, 20, `Nhãn của ${cardId}`).map(t => text(t, 64, 'Nhãn', true)); if (new Set(tags).size !== tags.length) fail(`Thẻ ${cardId} có nhãn trùng.`); tags.sort() }
    return { id: cardId, deckId, front: Object.freeze(face(c.front, `Mặt trước thẻ ${cardId}`)), back: Object.freeze(face(c.back, `Mặt sau thẻ ${cardId}`)), ...(tags ? { tags: Object.freeze(tags) } : {}), ...(Object.hasOwn(c, 'source') ? { source: text(c.source, 1000, 'Nguồn thẻ') } : {}), order: integer(c.order, 0, 'Thứ tự thẻ'), revision: integer(c.revision, 1, 'Revision thẻ') }
  }).sort(byId)
  const createdAt = timestamp(p.createdAt, 'Ngày tạo'), updatedAt = timestamp(p.updatedAt, 'Ngày sửa')
  if (updatedAt < createdAt) fail('Ngày sửa pack không thể trước ngày tạo.')
  const result: StudyPack = { type: STUDY_PACK_TYPE, schemaVersion: 1, id: packId, title: text(p.title, 120, 'Tên pack', true), description: text(p.description, 2000, 'Mô tả pack'), ...(Object.hasOwn(p, 'author') ? { author: text(p.author, 200, 'Tác giả') } : {}), ...(Object.hasOwn(p, 'source') ? { source: text(p.source, 1000, 'Nguồn pack') } : {}), createdAt, updatedAt, decks: Object.freeze(decks.map(d => Object.freeze(d))), cards: Object.freeze(cards.map(c => Object.freeze(c))) }
  // Every accepted pack must remain exportable in our own formatted JSON shape.
  if (new TextEncoder().encode(JSON.stringify(result, null, 2)).byteLength > MAX_PACK_BYTES) fail('Study Pack vượt giới hạn 8 MiB.')
  return Object.freeze(result)
}
export function parseStudyPack(json: string): StudyPack {
  if (new TextEncoder().encode(json).byteLength > MAX_PACK_BYTES) fail('Study Pack vượt giới hạn 8 MiB.')
  let depth = 0, quoted = false, escaped = false
  for (const c of json) {
    if (quoted) { if (escaped) escaped = false; else if (c === '\\') escaped = true; else if (c === '"') quoted = false }
    else if (c === '"') quoted = true
    else if (c === '{' || c === '[') { if (++depth > 10) fail('Study Pack lồng quá sâu (tối đa 10 cấp).') }
    else if (c === '}' || c === ']') depth--
  }
  let value: unknown
  try { value = JSON.parse(json) } catch (cause) { throw new Error('Không đọc được JSON. Hãy kiểm dấu ngoặc, dấu phẩy và dấu nháy.', { cause }) }
  return validateStudyPack(value)
}
export function exportStudyPack(pack: StudyPack) {
  const json = JSON.stringify(validateStudyPack(pack), null, 2)
  if (new TextEncoder().encode(json).byteLength > MAX_PACK_BYTES) fail('Study Pack xuất ra vượt giới hạn 8 MiB.')
  return json
}
export function validateStudyLibrary(value: unknown): readonly StudyPack[] {
  const packs = array(value, MAX_PACKS, 'Thư viện pack').map(validateStudyPack).sort(byId)
  const ids = new Set<string>()
  let count = 0
  for (const pack of packs) {
    count += pack.cards.length
    for (const entry of [pack, ...pack.decks, ...pack.cards]) { if (ids.has(entry.id)) fail(`ID ${entry.id} đã được dùng trong pack khác.`); ids.add(entry.id) }
  }
  if (count > 10_000) fail('Thư viện vượt giới hạn 10.000 thẻ.')
  return Object.freeze(packs)
}
export function mergeStudyPacks(current: readonly StudyPack[], incoming: readonly StudyPack[]) {
  const local = validateStudyLibrary(current), imported = validateStudyLibrary(incoming)
  const fresh: StudyPack[] = [], conflicts: string[] = []
  let duplicates = 0
  for (const pack of imported) {
    const old = local.find(p => p.id === pack.id)
    if (!old) fresh.push(pack)
    else if (JSON.stringify(old) === JSON.stringify(pack)) duplicates++
    else conflicts.push(`Pack ${pack.id} đã có nhưng khác nội dung hoặc metadata. Không ghi đè; hãy chỉnh ID và các tham chiếu trong bản nguồn nếu muốn một pack riêng.`)
  }
  if (conflicts.length) return { packs: local, added: 0, duplicates, conflicts }
  try { return { packs: validateStudyLibrary([...local, ...fresh]), added: fresh.length, duplicates, conflicts } }
  catch (error) { return { packs: local, added: 0, duplicates, conflicts: [(error as Error).message] } }
}
export function createPack(title: string, description = ''): StudyPack {
  const now = new Date().toISOString()
  return validateStudyPack({ type: STUDY_PACK_TYPE, schemaVersion: 1, id: crypto.randomUUID(), title, description, createdAt: now, updatedAt: now, decks: [], cards: [] })
}
function updatePack(pack: StudyPack, change: Partial<StudyPack>) { return validateStudyPack({ ...pack, ...change, updatedAt: new Date(Math.max(Date.now(), Date.parse(pack.updatedAt))).toISOString() }) }
export function addDeck(pack: StudyPack, title: string, description = '') {
  const deck: Deck = { id: crypto.randomUUID(), packId: pack.id, title, description, order: pack.decks.length ? Math.max(...pack.decks.map(d => d.order)) + 1 : 0 }
  return updatePack(pack, { decks: [...pack.decks, deck] })
}
export type CardInput = Pick<Flashcard, 'deckId' | 'front' | 'back' | 'tags' | 'source'>
export function saveCard(pack: StudyPack, input: CardInput, cardId?: string) {
  const old = cardId ? pack.cards.find(c => c.id === cardId) : undefined
  if (cardId && !old) fail(`Thẻ ${cardId} không còn tồn tại. Hãy mở lại bộ thẻ.`)
  const card: Flashcard = { ...input, id: old?.id ?? crypto.randomUUID(), order: old?.order ?? (pack.cards.length ? Math.max(...pack.cards.map(c => c.order)) + 1 : 0), revision: (old?.revision ?? 0) + 1 }
  return updatePack(pack, { cards: [...pack.cards.filter(c => c.id !== card.id), card] })
}
export function deleteCard(pack: StudyPack, cardId: string) { return updatePack(pack, { cards: pack.cards.filter(c => c.id !== cardId) }) }
