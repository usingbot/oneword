import { describe, expect, it } from 'vitest'
import { createDocument, currentText, MAX_TEXT_BYTES, readTextFile, revise, undo } from './document'

describe('in-memory document use cases', () => {
  it('keeps the exact original through edits, undo, and a new branch of edits', () => {
    const original = 'informa-\ntion\r\nwell-being x-ray -4 A-B'
    const first = createDocument(original, 'text.txt')
    const second = revise(first, 'information\r\nwell-being x-ray -4 A-B')
    const third = revise(second, 'đã sửa')
    expect(currentText(undo(third))).toBe(currentText(second))
    const branch = revise(undo(third), 'nhánh mới')
    expect(branch.original).toBe(original)
    expect(first.original).toBe(original)
    expect(Object.isFrozen(first)).toBe(true)
    expect(branch.revisions).toHaveLength(3)
    expect(currentText(undo(undo(branch)))).toBe(original)
    expect(undo(first)).toBe(first)
  })
  it('does not create a revision for an unchanged value', () => {
    const doc = createDocument('a', 'paste')
    expect(revise(doc, 'a')).toBe(doc)
  })
  it('reads UTF-8 text locally without normalizing source content', async () => {
    const content = 'Tiếng Việt\r\n-4 x-ray'
    expect(await readTextFile(new File([content], 'source.TXT'))).toBe(content)
  })
  it('rejects non-TXT, oversized, binary and invalid UTF-8 inputs', async () => {
    await expect(readTextFile(new File(['x'], 'book.pdf'))).rejects.toThrow('.txt')
    await expect(readTextFile(new File([new Uint8Array([0xff])], 'bad.txt'))).rejects.toThrow('UTF-8')
    await expect(readTextFile(new File(['a\0b'], 'binary.txt'))).rejects.toThrow('nhị phân')
    expect(() => createDocument('a'.repeat(MAX_TEXT_BYTES + 1), 'large')).toThrow('2 MB')
  })
})
