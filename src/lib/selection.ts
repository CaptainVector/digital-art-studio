/** Selections: rect / ellipse / lasso / mask (a union of rectangular runs). */
export type SelShape = 'rect' | 'ellipse' | 'lasso' | 'wand' | 'mask'
export type SelMode = 'new' | 'add' | 'subtract' | 'intersect'
export interface Pt { x: number; y: number }
export interface Run { x: number; y: number; w: number; h: number }

export interface Selection {
  x: number; y: number; w: number; h: number // bounding box, document px
  shape: SelShape
  points?: Pt[] // lasso, document px
  runs?: Run[] // wand / mask, document px
  /** Edge softness in document px (stamped when the selection is made). 0 / undefined = hard edge. */
  feather?: number
  /** false = hard, aliased edge (no smoothing). undefined / true = smooth edge. */
  antiAlias?: boolean
}

/** Convert a binary mask to rectangles (identical runs of consecutive rows are merged). */
export function maskToRuns(mask: Uint8Array, w: number, h: number): Run[] {
  const runs: Run[] = []
  let prev = new Map<number, Run>()
  for (let y = 0; y < h; y++) {
    const cur = new Map<number, Run>()
    let x = 0
    while (x < w) {
      if (!mask[y * w + x]) { x++; continue }
      const x0 = x
      while (x < w && mask[y * w + x]) x++
      const key = x0 * (w + 1) + x
      const p = prev.get(key)
      if (p) { p.h++; cur.set(key, p) }
      else {
        const r: Run = { x: x0, y, w: x - x0, h: 1 }
        runs.push(r)
        cur.set(key, r)
      }
    }
    prev = cur
  }
  return runs
}

export function combineMasks(mode: SelMode, a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length)
  for (let i = 0; i < a.length; i++) {
    if (mode === 'add') out[i] = a[i] | b[i]
    else if (mode === 'subtract') out[i] = a[i] & (b[i] ? 0 : 1)
    else if (mode === 'intersect') out[i] = a[i] & b[i]
    else out[i] = b[i]
  }
  return out
}

export function runsBounds(runs: Run[]) {
  if (!runs.length) return null
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const r of runs) {
    if (r.x < x0) x0 = r.x
    if (r.y < y0) y0 = r.y
    if (r.x + r.w > x1) x1 = r.x + r.w
    if (r.y + r.h > y1) y1 = r.y + r.h
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

export function runsToSvgPath(runs: Run[]): string {
  const parts: string[] = []
  for (const r of runs) parts.push(`M${r.x} ${r.y}h${r.w}v${r.h}h${-r.w}z`)
  return parts.join('')
}

// ---------- browser-only helpers ----------
const pathCache = new WeakMap<Selection, Path2D>()

/** Path of the selection in document px (cached per selection object). */
export function selectionPath(sel: Selection): Path2D {
  const cached = pathCache.get(sel)
  if (cached) return cached
  const p = new Path2D()
  if (sel.runs) {
    for (const r of sel.runs) p.rect(r.x, r.y, r.w, r.h)
  } else if (sel.shape === 'lasso' && sel.points && sel.points.length > 2) {
    p.moveTo(sel.points[0].x, sel.points[0].y)
    for (let i = 1; i < sel.points.length; i++) p.lineTo(sel.points[i].x, sel.points[i].y)
    p.closePath()
  } else if (sel.shape === 'ellipse') {
    p.ellipse(sel.x + sel.w / 2, sel.y + sel.h / 2, Math.max(0.01, sel.w / 2), Math.max(0.01, sel.h / 2), 0, 0, Math.PI * 2)
  } else {
    p.rect(sel.x, sel.y, sel.w, sel.h)
  }
  pathCache.set(sel, p)
  return p
}

/**
 * Soft selection mask (0..255 alpha) for a region of a layer canvas. `region` is in layer-canvas px;
 * the layer maps to the document as  layerPx = docPx * dpr - offset.
 */
export function buildSelectionMask(
  sel: Selection,
  region: { x: number; y: number; w: number; h: number },
  offsetX: number,
  offsetY: number,
  dpr: number,
): Uint8ClampedArray {
  const c = document.createElement('canvas')
  c.width = region.w
  c.height = region.h
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.translate(-region.x - offsetX, -region.y - offsetY)
  ctx.scale(dpr, dpr)
  ctx.fillStyle = '#000'
  ctx.fill(selectionPath(sel))
  const d = ctx.getImageData(0, 0, region.w, region.h).data
  const n = region.w * region.h
  const f = new Float32Array(n)
  const hard = sel.antiAlias === false
  for (let i = 0; i < n; i++) {
    const a = d[i * 4 + 3]
    f[i] = hard ? (a > 127 ? 255 : 0) : a
  }
  const feather = (sel.feather ?? 0) * dpr
  if (feather > 0) blurMask(f, region.w, region.h, feather / 2)
  const out = new Uint8ClampedArray(n)
  for (let i = 0; i < n; i++) out[i] = f[i]
  return out
}

function rasterize(sel: Selection, docW: number, docH: number, cw: number, ch: number): Uint8Array {
  const c = document.createElement('canvas')
  c.width = cw
  c.height = ch
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.scale(cw / docW, ch / docH)
  ctx.fillStyle = '#000'
  ctx.fill(selectionPath(sel))
  const d = ctx.getImageData(0, 0, cw, ch).data
  const m = new Uint8Array(cw * ch)
  for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] > 127 ? 1 : 0
  return m
}

/** Real boolean combination of two selections (add / subtract / intersect). */
export function combineSelections(
  mode: SelMode,
  prev: Selection | null,
  next: Selection,
  docW: number,
  docH: number,
): Selection | null {
  if (mode === 'new' || !prev || prev.w < 1 || prev.h < 1) return next
  const f = Math.min(1, 4096 / Math.max(docW, docH))
  const cw = Math.max(1, Math.round(docW * f))
  const ch = Math.max(1, Math.round(docH * f))
  const res = combineMasks(mode, rasterize(prev, docW, docH, cw, ch), rasterize(next, docW, docH, cw, ch))
  const sx = docW / cw, sy = docH / ch
  const runs = maskToRuns(res, cw, ch).map(r => ({ x: r.x * sx, y: r.y * sy, w: r.w * sx, h: r.h * sy }))
  const b = runsBounds(runs)
  if (!b) return null
  return { ...b, shape: 'mask', runs, feather: prev.feather, antiAlias: prev.antiAlias }
}

// ---------- feather / anti-alias ----------

/** True when the selection can't be expressed as a plain (smooth) clip path. */
export function selectionNeedsMask(sel: Selection | null | undefined): boolean {
  return !!sel && ((sel.feather ?? 0) > 0 || sel.antiAlias === false)
}

/** Pixels around the selection edge that a soft mask can touch (layer px). */
export function selectionMargin(sel: Selection, dpr: number): number {
  return Math.ceil((sel.feather ?? 0) * dpr * 1.5) + 2
}

/**
 * In-place blur of a single-channel image (3 box passes ~ gaussian). `radius` is the
 * half-width of each box in px. Edges are treated as empty (0).
 */
export function blurMask(a: Float32Array, w: number, h: number, radius: number): void {
  const r = Math.max(0, Math.round(radius))
  if (r < 1) return
  const tmp = new Float32Array(Math.max(w, h))
  const inv = 1 / (2 * r + 1)
  const pass = (get: (i: number) => number, set: (i: number, v: number) => void, n: number) => {
    let sum = 0
    for (let i = -r; i <= r; i++) sum += i >= 0 && i < n ? get(i) : 0
    for (let i = 0; i < n; i++) {
      tmp[i] = sum * inv
      const add = i + r + 1, rem = i - r
      if (add < n) sum += get(add)
      if (rem >= 0) sum -= get(rem)
    }
    for (let i = 0; i < n; i++) set(i, tmp[i])
  }
  for (let k = 0; k < 3; k++) {
    for (let y = 0; y < h; y++) {
      const o = y * w
      pass(i => a[o + i], (i, v) => { a[o + i] = v }, w)
    }
    for (let x = 0; x < w; x++) {
      pass(i => a[i * w + x], (i, v) => { a[i * w + x] = v }, h)
    }
  }
}
