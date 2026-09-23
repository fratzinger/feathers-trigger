import { get, set } from '../src/utils.internal.js'

describe('utils.internal', function () {
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

  describe('get', function () {
    it('reads a dotted path', function () {
      const obj = { params: { changesById: { itemsBefore: { a: 1 } } } }
      expect(get(obj, 'params.changesById.itemsBefore')).toStrictEqual({ a: 1 })
    })

    it('returns undefined for a missing path instead of throwing', function () {
      expect(get({ params: {} }, 'params.nope.deeper')).toBe(undefined)
    })
  })
})
