/**
 * Generic undo/redo manager.
 *
 * Model: `push(entry)` must be called with the state *before* a change is made.
 * `undo(capture)` captures the *current* state (via `capture`, so it can be redone),
 * pops the previous entry and returns it. `redo` is symmetric.
 * Entries carry a byte size so the total memory can be bounded.
 */
export interface Sized<T> {
  entry: T
  bytes: number
}

export class HistoryManager<T> {
  private undoStack: Sized<T>[] = []
  private redoStack: Sized<T>[] = []

  private maxEntries: number
  private maxBytes: number

  constructor(maxEntries = 40, maxBytes = 300 * 1024 * 1024) {
    this.maxEntries = maxEntries
    this.maxBytes = maxBytes
  }

  get canUndo() { return this.undoStack.length > 0 }
  get canRedo() { return this.redoStack.length > 0 }
  get size() { return this.undoStack.length }

  push(entry: T, bytes = 0) {
    this.undoStack.push({ entry, bytes })
    this.redoStack = []
    this.trim()
  }

  /** Returns the entry to restore, or null when there is nothing to undo. */
  undo(capture: (target: T) => Sized<T>): T | null {
    const target = this.undoStack.pop()
    if (!target) return null
    this.redoStack.push(capture(target.entry))
    return target.entry
  }

  redo(capture: (target: T) => Sized<T>): T | null {
    const target = this.redoStack.pop()
    if (!target) return null
    this.undoStack.push(capture(target.entry))
    return target.entry
  }

  clear() {
    this.undoStack = []
    this.redoStack = []
  }

  private trim() {
    let total = this.undoStack.reduce((s, e) => s + e.bytes, 0)
    // always keep at least the newest entry
    while (
      this.undoStack.length > 1 &&
      (this.undoStack.length > this.maxEntries || total > this.maxBytes)
    ) {
      total -= this.undoStack.shift()!.bytes
    }
  }
}
