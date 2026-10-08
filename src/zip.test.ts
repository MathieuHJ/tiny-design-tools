import { describe, expect, it } from 'vitest'
import { createZip, crc32 } from './zip'

/** A small independent reader, so the writer is checked against the format and not against itself. */
function readZip(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const endAt = bytes.length - 22
  expect(view.getUint32(endAt, true)).toBe(0x06054b50)
  const count = view.getUint16(endAt + 10, true)
  let cursor = view.getUint32(endAt + 16, true)
  const files: { name: string; data: Uint8Array; crc: number }[] = []
  for (let i = 0; i < count; i += 1) {
    expect(view.getUint32(cursor, true)).toBe(0x02014b50)
    const crc = view.getUint32(cursor + 16, true)
    const size = view.getUint32(cursor + 24, true)
    const nameLength = view.getUint16(cursor + 28, true)
    const localAt = view.getUint32(cursor + 42, true)
    const name = new TextDecoder().decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength))
    expect(view.getUint32(localAt, true)).toBe(0x04034b50)
    const localName = view.getUint16(localAt + 26, true)
    const dataAt = localAt + 30 + localName
    files.push({ name, data: bytes.slice(dataAt, dataAt + size), crc })
    cursor += 46 + nameLength
  }
  return files
}

describe('ZIP writer', () => {
  it('matches the standard CRC-32 check value', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926)
    expect(crc32(new Uint8Array(0))).toBe(0)
  })

  it('round-trips several files, including a UTF-8 name and an empty file', () => {
    const png = Uint8Array.from({ length: 5000 }, (_, i) => (i * 31) % 251)
    const archive = createZip([
      { name: 'x-header-1500x500.png', data: png },
      { name: 'board.png', data: new TextEncoder().encode('hello') },
      { name: 'café/empty.txt', data: new Uint8Array(0) },
    ], new Date(2026, 9, 8, 12, 30, 10))
    const files = readZip(archive)
    expect(files.map((file) => file.name)).toEqual(['x-header-1500x500.png', 'board.png', 'café/empty.txt'])
    expect(files[0].data).toEqual(png)
    expect(new TextDecoder().decode(files[1].data)).toBe('hello')
    expect(files[2].data.length).toBe(0)
    for (const file of files) expect(file.crc).toBe(crc32(file.data))
  })

  it('is a valid empty archive when there are no files', () => {
    expect(readZip(createZip([]))).toEqual([])
  })
})
