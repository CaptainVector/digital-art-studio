/** Pixel helpers for the paint bucket and the magic wand (pure, no DOM). */
export interface PixelBuf {
  width: number
  height: number
  data: Uint8ClampedArray
}

export interface MaskResult {
  mask: Uint8Array // 1 = inside region, indexed y * width + x
  count: number
  bounds: { x: number; y: number; w: number; h: number }
}

/**
 * Region of pixels similar to the seed pixel. Contiguous mode uses an iterative
 * scanline fill (typed arrays, no per-pixel stack growth).
 */
export function floodMask(
  src: PixelBuf,
  startX: number,
  startY: number,
  tolerance: number,
  contiguous = true,
): MaskResult | null {
  const { width: w, height: h, data } = src
  if (startX < 0 || startY < 0 || startX >= w || startY >= h) return null
  const i0 = (startY * w + startX) * 4
  const tr = data[i0], tg = data[i0 + 1], tb = data[i0 + 2], ta = data[i0 + 3]
  const match = (p: number) =>
    Math.abs(data[p] - tr) <= tolerance &&
    Math.abs(data[p + 1] - tg) <= tolerance &&
    Math.abs(data[p + 2] - tb) <= tolerance &&
    Math.abs(data[p + 3] - ta) <= tolerance

  const mask = new Uint8Array(w * h)
  let count = 0
  let minX = w, maxX = -1, minY = h, maxY = -1
  const grow = (xl: number, xr: number, y: number) => {
    if (xl < minX) minX = xl
    if (xr > maxX) maxX = xr
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }

  if (!contiguous) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (match((y * w + x) * 4)) {
          mask[y * w + x] = 1
          count++
          grow(x, x, y)
        }
      }
    }
  } else {
    const stack: number[] = [startX, startY]
    while (stack.length) {
      const y = stack.pop()!
      const x = stack.pop()!
      const row = y * w
      if (mask[row + x] || !match((row + x) * 4)) continue
      let xl = x
      while (xl > 0 && !mask[row + xl - 1] && match((row + xl - 1) * 4)) xl--
      let xr = x
      while (xr < w - 1 && !mask[row + xr + 1] && match((row + xr + 1) * 4)) xr++
      for (let i = xl; i <= xr; i++) mask[row + i] = 1
      count += xr - xl + 1
      grow(xl, xr, y)
      for (const ny of [y - 1, y + 1]) {
        if (ny < 0 || ny >= h) continue
        const nrow = ny * w
        let inSpan = false
        for (let i = xl; i <= xr; i++) {
          const ok = !mask[nrow + i] && match((nrow + i) * 4)
          if (ok && !inSpan) { stack.push(i, ny); inSpan = true }
          else if (!ok) inSpan = false
        }
      }
    }
  }

  if (count === 0) return null
  return { mask, count, bounds: { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 } }
}

/** Paint `rgba` into `dst` wherever `mask` is set (optionally softening the border). */
export function applyFill(
  dst: PixelBuf,
  mask: Uint8Array,
  rgba: [number, number, number, number],
  blendMode = 'source-over',
  antiAlias = false,
) {
  const { width: w, height: h, data } = dst
  const [fillR, fillG, fillB, fillA] = rgba

  const blendPixel = (i: number, alphaScale: number) => {
    const sa = (fillA / 255) * alphaScale
    if (sa <= 0) return
    const dr = data[i], dg = data[i + 1], db = data[i + 2], da = data[i + 3] / 255
    let rr = fillR, rg = fillG, rb = fillB
    if (blendMode === 'multiply') {
      rr = (fillR * dr) / 255; rg = (fillG * dg) / 255; rb = (fillB * db) / 255
    } else if (blendMode === 'screen') {
      rr = 255 - ((255 - fillR) * (255 - dr)) / 255
      rg = 255 - ((255 - fillG) * (255 - dg)) / 255
      rb = 255 - ((255 - fillB) * (255 - db)) / 255
    } else if (blendMode === 'overlay') {
      const ov = (c: number, d: number) => (d < 128 ? (2 * c * d) / 255 : 255 - (2 * (255 - c) * (255 - d)) / 255)
      rr = ov(fillR, dr); rg = ov(fillG, dg); rb = ov(fillB, db)
    }
    const outA = sa + da * (1 - sa)
    if (outA <= 0) return
    data[i] = Math.round((rr * sa + dr * da * (1 - sa)) / outA)
    data[i + 1] = Math.round((rg * sa + dg * da * (1 - sa)) / outA)
    data[i + 2] = Math.round((rb * sa + db * da * (1 - sa)) / outA)
    data[i + 3] = Math.round(outA * 255)
  }

  for (let p = 0; p < mask.length; p++) if (mask[p]) blendPixel(p * 4, 1)

  if (antiAlias) {
    const edge = new Uint8Array(w * h)
    for (let p = 0; p < mask.length; p++) {
      if (!mask[p]) continue
      const x = p % w, y = (p / w) | 0
      if (x + 1 < w && !mask[p + 1]) edge[p + 1] = 1
      if (x > 0 && !mask[p - 1]) edge[p - 1] = 1
      if (y + 1 < h && !mask[p + w]) edge[p + w] = 1
      if (y > 0 && !mask[p - w]) edge[p - w] = 1
    }
    for (let p = 0; p < edge.length; p++) if (edge[p]) blendPixel(p * 4, 0.35)
  }
}
