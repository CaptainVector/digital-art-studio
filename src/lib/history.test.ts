import { describe, it, expect } from 'vitest'
import { HistoryManager } from './history'

// tiny "document": a string; every action pushes the pre-state first
const make = () => {
  let doc = 'blank'
  const h = new HistoryManager<string>(40, 1e9)
  const cap = () => (t: string) => ({ entry: doc, bytes: t.length })
  return {
    get doc() { return doc },
    act: (s: string) => { h.push(doc, 1); doc += s },
    undo: () => { const e = h.undo(cap()); if (e !== null) doc = e },
    redo: () => { const e = h.redo(cap()); if (e !== null) doc = e },
    h,
  }
}

describe('HistoryManager', () => {
  it('undoes the very first action', () => {
    const t = make(); t.act('+1'); t.undo()
    expect(t.doc).toBe('blank')
  })
  it('undoes one step at a time and redoes the last step', () => {
    const t = make(); t.act('+1'); t.act('+2'); t.act('+3')
    t.undo(); expect(t.doc).toBe('blank+1+2')
    t.redo(); expect(t.doc).toBe('blank+1+2+3')
    t.undo(); t.undo(); t.undo(); expect(t.doc).toBe('blank')
    t.undo(); expect(t.doc).toBe('blank') // nothing left
  })
  it('drops the redo stack after a new action', () => {
    const t = make(); t.act('+1'); t.act('+2'); t.undo(); t.act('+x')
    expect(t.h.canRedo).toBe(false)
    expect(t.doc).toBe('blank+1+x')
  })
  it('bounds entries and bytes but keeps the newest', () => {
    const h = new HistoryManager<number>(3, 1e9)
    for (let i = 0; i < 10; i++) h.push(i, 1)
    expect(h.size).toBe(3)
    const h2 = new HistoryManager<number>(100, 10)
    h2.push(1, 8); h2.push(2, 8); h2.push(3, 50)
    expect(h2.size).toBe(1)
  })
})
