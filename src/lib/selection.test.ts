import { describe, it, expect } from 'vitest'
import { maskToRuns, combineMasks, runsBounds, runsToSvgPath, blurMask, selectionNeedsMask } from './selection'

const m = (rows: string[]) => new Uint8Array(rows.flatMap(r => [...r].map(c => (c === '#' ? 1 : 0))))

describe('selection masks', () => {
  it('merges identical rows into one run', () => {
    const runs = maskToRuns(m(['.##.', '.##.', '.##.']), 4, 3)
    expect(runs).toEqual([{ x: 1, y: 0, w: 2, h: 3 }])
  })
  it('keeps different rows separate', () => {
    expect(maskToRuns(m(['##..', '.##.']), 4, 2)).toHaveLength(2)
  })
  it('add / subtract / intersect behave as set operations', () => {
    const a = m(['##..']), b = m(['.##.'])
    expect(Array.from(combineMasks('add', a, b))).toEqual([1, 1, 1, 0])
    expect(Array.from(combineMasks('subtract', a, b))).toEqual([1, 0, 0, 0])
    expect(Array.from(combineMasks('intersect', a, b))).toEqual([0, 1, 0, 0])
  })
  it('bounds and svg path', () => {
    const runs = maskToRuns(m(['.##.', '.##.']), 4, 2)
    expect(runsBounds(runs)).toEqual({ x: 1, y: 0, w: 2, h: 2 })
    expect(runsToSvgPath(runs)).toBe('M1 0h2v2h-2z')
  })
})

describe('feather / anti-alias', () => {
  it('blurMask softens edges and keeps total mass', () => {
    const w = 60, h = 60
    const a = new Float32Array(w * h)
    for (let y = 20; y < 40; y++) for (let x = 20; x < 40; x++) a[y * w + x] = 255
    blurMask(a, w, h, 3)
    const mid = a[30 * w + 20]
    expect(mid).toBeGreaterThan(80)
    expect(mid).toBeLessThan(175)
    expect(a[30 * w + 30]).toBeGreaterThan(250)
    expect(a[30 * w + 5]).toBe(0)
    const sum = a.reduce((x, y) => x + y, 0)
    expect(Math.abs(sum - 255 * 400)).toBeLessThan(255)
  })

  it('selectionNeedsMask only for feathered or aliased selections', () => {
    const base = { x: 0, y: 0, w: 10, h: 10, shape: 'rect' as const }
    expect(selectionNeedsMask(base)).toBe(false)
    expect(selectionNeedsMask({ ...base, feather: 0, antiAlias: true })).toBe(false)
    expect(selectionNeedsMask({ ...base, feather: 5 })).toBe(true)
    expect(selectionNeedsMask({ ...base, antiAlias: false })).toBe(true)
    expect(selectionNeedsMask(null)).toBe(false)
  })
})
