// Rasterize the project's own ring-and-dot mark. No fonts or third-party art.
import { deflateSync } from 'node:zlib'
import { Buffer } from 'node:buffer'
import { mkdir, writeFile } from 'node:fs/promises'
function crc(bytes) { let c = 0xffffffff; for (const b of bytes) { c ^= b; for (let i = 0; i < 8; i++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1 }; return (c ^ 0xffffffff) >>> 0 }
function chunk(type, data) { const tag = Buffer.from(type), length = Buffer.alloc(4), sum = Buffer.alloc(4); length.writeUInt32BE(data.length); sum.writeUInt32BE(crc(Buffer.concat([tag, data]))); return Buffer.concat([length, tag, data, sum]) }
await mkdir('public/icons', { recursive: true })
for (const [size, name, scale] of [[192, 'icon-192', 1], [512, 'icon-512', 1], [512, 'maskable-512', .78]]) {
  const rows = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const px = (x / size - .5) / scale + .5, py = (y / size - .5) / scale + .5
    const radius = Math.hypot(px - .5, py - .53), dot = Math.hypot(px - .76, py - .22)
    const color = dot < .055 ? [197, 217, 152] : radius > .2 && radius < .29 ? [239, 244, 223] : [53, 85, 62]
    const pos = y * (size * 4 + 1) + 1 + x * 4; rows.set([...color, 255], pos)
  }
  const header = Buffer.alloc(13); header.writeUInt32BE(size); header.writeUInt32BE(size, 4); header[8] = 8; header[9] = 6
  await writeFile(`public/icons/${name}.png`, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]))
}
