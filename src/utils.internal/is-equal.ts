/**
 * Whether `a` and `b` fetch the same items, as a query or params. Plain
 * objects and arrays are compared by content, dates and regular expressions by
 * value, and everything else - functions, class instances, maps, sets - by
 * reference: a class instance may keep its state in private fields, so equal
 * looking instances aren't necessarily equal. Self-references are fine.
 *
 * Never mistakes different values for equal, but may miss equal ones - which
 * costs one more fetch at most.
 */
export const isEqual = (a: unknown, b: unknown): boolean =>
  compare(a, b, new Map())

/**
 * A copy of `value` that doesn't change along with it, to compare it with
 * `isEqual` later: plain objects and arrays are copied, everything else is
 * compared by reference anyway and kept.
 */
export const snapshot = <T>(value: T): T => copy(value, new Map())

const isPlainObject = (
  value: unknown,
): value is Record<PropertyKey, unknown> => {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

/** own enumerable keys, symbols included - sequelize uses them as operators */
const keysOf = (obj: object): PropertyKey[] =>
  Reflect.ownKeys(obj).filter((key) =>
    Object.prototype.propertyIsEnumerable.call(obj, key),
  )

/**
 * `comparing` holds the pairs up the stack: meeting one of them again means a
 * self-reference, which is equal as far as the rest of both values is
 */
const compare = (
  a: unknown,
  b: unknown,
  comparing: Map<object, Set<object>>,
): boolean => {
  if (Object.is(a, b)) {
    return true
  }
  if (
    typeof a !== 'object' ||
    typeof b !== 'object' ||
    a === null ||
    b === null ||
    Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)
  ) {
    return false
  }

  if (a instanceof Date) {
    return Object.is(a.getTime(), (b as Date).getTime())
  }
  if (a instanceof RegExp) {
    return a.source === (b as RegExp).source && a.flags === (b as RegExp).flags
  }
  if (!Array.isArray(a) && !isPlainObject(a)) {
    return false
  }

  if (comparing.get(a)?.has(b)) {
    return true
  }
  comparing.set(a, (comparing.get(a) ?? new Set()).add(b))

  const keys = keysOf(a)
  if (keys.length !== keysOf(b).length) {
    return false
  }
  return keys.every(
    (key) =>
      Object.prototype.propertyIsEnumerable.call(b, key) &&
      compare((a as any)[key], (b as any)[key], comparing),
  )
}

const copy = <T>(value: T, copies: Map<object, unknown>): T => {
  if (!Array.isArray(value) && !isPlainObject(value)) {
    return value
  }
  if (copies.has(value)) {
    return copies.get(value) as T
  }

  const result = Array.isArray(value)
    ? []
    : Object.create(Object.getPrototypeOf(value))
  copies.set(value, result)

  for (const key of keysOf(value)) {
    // defined instead of assigned, so a `__proto__` key stays a key
    Object.defineProperty(result, key, {
      value: copy((value as any)[key], copies),
      enumerable: true,
      writable: true,
      configurable: true,
    })
  }

  return result
}

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest

  // distinct instances with the same value
  const [reA, reAAgain, reAIgnoreCase, reAIgnoreCaseAgain, reB] = [
    /a/,
    /a/,
    /a/i,
    /a/i,
    /b/,
  ]

  const cyclic = (value: Record<string, unknown>) => {
    const obj: any = { ...value }
    obj.self = obj
    obj.list = [obj]
    return obj
  }

  describe('isEqual', function () {
    it('compares plain objects and arrays by content, in any key order', function () {
      expect(
        isEqual({ a: 1, b: [1, { c: 2 }] }, { b: [1, { c: 2 }], a: 1 }),
      ).toBe(true)
      expect(isEqual({ a: 1 }, { a: 2 })).toBe(false)
      expect(isEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false)
      expect(isEqual({ a: undefined }, {})).toBe(false)
      expect(isEqual([1, 2], [2, 1])).toBe(false)
      expect(isEqual([], {})).toBe(false)
      expect(isEqual(Object.create(null), {})).toBe(false)
    })

    it('compares primitives, BigInt included', function () {
      expect(isEqual(1n, 1n)).toBe(true)
      expect(isEqual({ id: 1n }, { id: 2n })).toBe(false)
      expect(isEqual(1n, 1)).toBe(false)
      expect(isEqual(NaN, NaN)).toBe(true)
      expect(isEqual('1', 1)).toBe(false)
      expect(isEqual(null, undefined)).toBe(false)
    })

    it('compares symbol keys', function () {
      const gt = Symbol('gt')
      expect(isEqual({ [gt]: 1 }, { [gt]: 1 })).toBe(true)
      expect(isEqual({ [gt]: 1 }, { [gt]: 2 })).toBe(false)
      expect(isEqual({ [gt]: 1 }, { [Symbol('gt')]: 1 })).toBe(false)
    })

    it('compares dates and regular expressions by value', function () {
      expect(isEqual(new Date(0), new Date(0))).toBe(true)
      expect(isEqual(new Date(0), new Date(1))).toBe(false)
      expect(isEqual(new Date(0), new Date(0).toISOString())).toBe(false)
      expect(isEqual(reAIgnoreCase, reAIgnoreCaseAgain)).toBe(true)
      expect(isEqual(reA, reAAgain)).toBe(true)
      expect(isEqual(reA, reB)).toBe(false)
      expect(isEqual(reA, reAIgnoreCase)).toBe(false)
    })

    it('compares functions by reference', function () {
      const fn = () => true
      expect(isEqual({ fn }, { fn })).toBe(true)
      expect(isEqual({ fn: () => true }, { fn: () => true })).toBe(false)
    })

    it('compares class instances, maps and sets by reference', function () {
      class Id {
        #hex: string
        constructor(hex: string) {
          this.#hex = hex
        }
        toString() {
          return this.#hex
        }
      }
      const id = new Id('a')
      expect(isEqual({ id }, { id })).toBe(true)
      // look the same, but aren't
      expect(isEqual(new Id('a'), new Id('b'))).toBe(false)
      expect(isEqual(new Map(), new Map())).toBe(false)
      expect(isEqual(new Set(), new Set())).toBe(false)
    })

    it('handles self-references', function () {
      const a = cyclic({ n: 1 })
      expect(isEqual(a, a)).toBe(true)
      expect(isEqual(a, cyclic({ n: 1 }))).toBe(true)
      expect(isEqual(a, cyclic({ n: 2 }))).toBe(false)
      expect(isEqual({ a }, { a: cyclic({ n: 2 }) })).toBe(false)
    })
  })

  describe('snapshot', function () {
    it('is equal to the value', function () {
      const fn = () => true
      const value = { a: [1, { b: reB, d: new Date(0) }], fn, id: 1n }
      expect(isEqual(snapshot(value), value)).toBe(true)
    })

    it("doesn't change along with the value", function () {
      const value = { a: { $in: [1] } }
      const copy = snapshot(value)
      value.a.$in.push(2)
      expect(isEqual(copy, value)).toBe(false)
      expect(copy).toStrictEqual({ a: { $in: [1] } })
    })

    it('keeps everything but plain objects and arrays', function () {
      const fn = () => true
      const date = new Date(0)
      const map = new Map()
      const copy = snapshot({ fn, date, map })
      expect(copy.fn).toBe(fn)
      expect(copy.date).toBe(date)
      expect(copy.map).toBe(map)
    })

    it('copies self-references', function () {
      const value = cyclic({ n: 1 })
      const copy = snapshot(value)
      expect(copy).not.toBe(value)
      expect(copy.self).toBe(copy)
      expect(copy.list[0]).toBe(copy)
      expect(isEqual(copy, value)).toBe(true)
    })

    it('copies symbol keys and keeps a `__proto__` key a key', function () {
      const gt = Symbol('gt')
      const value = JSON.parse('{"__proto__": {"a": 1}}')
      value[gt] = 1
      const copy = snapshot(value)
      expect(Object.getPrototypeOf(copy)).toBe(Object.prototype)
      expect(copy[gt]).toBe(1)
      expect(isEqual(copy, value)).toBe(true)
    })
  })
}
