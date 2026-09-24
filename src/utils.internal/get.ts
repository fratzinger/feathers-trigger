import type { Path } from './path.js'
import { toKeys } from './path.js'

/**
 * Minimal replacement for `lodash/get`
 */
export const get = (obj: any, path: Path): any => {
  let current = obj
  for (const key of toKeys(path)) {
    if (current == null) {
      return undefined
    }
    current = current[key]
  }
  return current
}

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest

  describe('get', function () {
    it('reads a dotted path', function () {
      const obj = { params: { changesById: { itemsBefore: { a: 1 } } } }
      expect(get(obj, 'params.changesById.itemsBefore')).toStrictEqual({ a: 1 })
    })

    it('returns undefined for a missing path instead of throwing', function () {
      expect(get({ params: {} }, 'params.nope.deeper')).toBe(undefined)
    })
  })
}
