import type { Path } from './path.js'
import { toKeys } from './path.js'

/**
 * Minimal replacement for `lodash/set`
 */
export const set = (obj: any, path: Path, value: unknown): void => {
  const keys = toKeys(path)
  const lastKey = keys.at(-1)

  if (lastKey === undefined) {
    return
  }

  let current = obj
  for (const key of keys.slice(0, -1)) {
    if (typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {}
    }
    current = current[key]
  }

  current[lastKey] = value
}

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest

  describe('set', function () {
    it('creates missing objects along a dotted path', function () {
      const obj: any = {}
      set(obj, 'params.changesById.itemsBefore', { a: 1 })
      expect(obj).toStrictEqual({
        params: { changesById: { itemsBefore: { a: 1 } } },
      })
    })

    it('treats every array segment as a single key, dots included', function () {
      const obj: any = {}
      // the identifier is a JSON string and may well contain dots
      set(obj, ['params', 'changesById', '{"a.b":1}', 'itemsBefore'], 2)
      expect(obj.params.changesById['{"a.b":1}'].itemsBefore).toBe(2)
    })

    it('keeps existing siblings', function () {
      const obj: any = { params: { changesById: { a: 1 } }, other: true }
      set(obj, 'params.changesById.b', 2)
      expect(obj).toStrictEqual({
        params: { changesById: { a: 1, b: 2 } },
        other: true,
      })
    })

    it('replaces a primitive on the way with an object', function () {
      const obj: any = { params: 1 }
      set(obj, 'params.changesById', 2)
      expect(obj).toStrictEqual({ params: { changesById: 2 } })
    })
  })
}
