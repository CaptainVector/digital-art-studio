import { describe, it, expect } from 'vitest'
import { floodMask, applyFill, type PixelBuf } from './fill'

const buf = (w: number, h: number, rows: string[]): PixelBuf => {
  const data = new Uint8ClampedArray(w * h * 4)
  rows.forEach((row, y) => [...row].forEach((c, x) => {
    const i = (y * w + x) * 4
    const v = c === '#' ? 0 : 255
    data[i] = data[i + 1] = data[i + 2] = v; data[i + 3] = 255
  }))
  return { width: w, height: h, data }
}

describe('floodMask', () => {
  const img = buf(5, 3, ['..#..', '..#..', '..#..'])
  it('contiguous fill stops at the wall', () => {
    const r = floodMask(img, 0, 0, 0, true)!
    expect(r.count).toBe(6)
    expect(r.bounds).toEqual({ x: 0, y: 0, w: 2, h: 3 })
  })
  it('non-contiguous fill takes both sides', () => {
    expect(floodMask(img, 0, 0, 0, false)!.count).toBe(12)
  })
  it('tolerance lets the fill cross similar colors', () => {
    expect(floodMask(img, 0, 0, 255, true)!.count).toBe(15)
  })
  it('handles a large empty buffer without blowing the stack', () => {
    const w = 1200, h = 1200
    const big: PixelBuf = { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }
    expect(floodMask(big, 10, 10, 0, true)!.count).toBe(w * h)
  })
  it('returns null outside the buffer', () => {
    expect(floodMask(img, 9, 9, 0)).toBeNull()
  })
})

describe('applyFill', () => {
  it('paints only masked pixels', () => {
    const img = buf(5, 3, ['.....', '.....', '.....'])
    const { mask } = floodMask(buf(5, 3, ['..#..', '..#..', '..#..']), 0, 0, 0)!
    applyFill(img, mask, [255, 0, 0, 255])
    expect(Array.from(img.data.slice(0, 4))).toEqual([255, 0, 0, 255])
    expect(Array.from(img.data.slice(4 * 4, 4 * 4 + 4))).toEqual([255, 255, 255, 255])
  })
})
