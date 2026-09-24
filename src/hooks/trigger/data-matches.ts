import type { HookContext } from '@feathersjs/feathers'
import { testCondition } from './test-condition.js'
import type { Condition } from './types.js'

export type DataMatch = { item: any; isMatch: boolean }

/**
 * Tests `data` for every item of `context.data`: on multi create for every
 * item, just like on single create
 */
export const getDataMatches = async (
  condition: Condition,
  context: HookContext,
): Promise<DataMatch[]> => {
  const items = Array.isArray(context.data) ? context.data : [context.data]

  return await Promise.all(
    items.map(async (item) => ({
      item,
      isMatch: await testCondition({ condition, item, context }),
    })),
  )
}

/**
 * On multi create, `data` is tested for every item in the before hook. This
 * maps the items that didn't match to the ids of the created items: by their
 * id in `data` if there is one, otherwise by their position in the result.
 */
export const getDataMismatchIds = (
  context: HookContext,
  dataMatches: DataMatch[] | undefined,
): Set<string> | undefined => {
  if (!dataMatches) {
    return
  }

  const idField = context.service.id
  const ids = new Set<string>()

  dataMatches.forEach(({ item, isMatch }, index) => {
    if (isMatch) {
      return
    }

    let id = item?.[idField]

    if (id == null) {
      if (
        !Array.isArray(context.result) ||
        context.result.length !== dataMatches.length
      ) {
        throw new Error(
          "Can't map 'context.data' to 'context.result' to test 'data' on multi create",
        )
      }

      id = context.result[index]?.[idField]
    }

    ids.add(String(id))
  })

  return ids
}

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest

  describe('getDataMatches', function () {
    it('tests the item on single create', async function () {
      const context = { data: { count: 1 } } as HookContext
      expect(await getDataMatches({ count: 1 }, context)).toStrictEqual([
        { item: { count: 1 }, isMatch: true },
      ])
    })

    it('tests every item on multi create', async function () {
      const context = { data: [{ count: 1 }, { count: 2 }] } as HookContext
      expect(await getDataMatches({ count: 1 }, context)).toStrictEqual([
        { item: { count: 1 }, isMatch: true },
        { item: { count: 2 }, isMatch: false },
      ])
    })
  })

  describe('getDataMismatchIds', function () {
    const service = { id: 'id' }

    it('returns undefined without dataMatches', function () {
      const context = { service } as HookContext
      expect(getDataMismatchIds(context, undefined)).toBe(undefined)
    })

    it('maps a mismatch by its id in data', function () {
      const context = { service, result: [] } as HookContext
      const dataMatches = [
        { item: { id: 1 }, isMatch: true },
        { item: { id: 2 }, isMatch: false },
      ]
      expect(getDataMismatchIds(context, dataMatches)).toStrictEqual(
        new Set(['2']),
      )
    })

    it('maps a mismatch without id by its position in the result', function () {
      const context = {
        service,
        result: [{ id: 10 }, { id: 11 }],
      } as HookContext
      const dataMatches = [
        { item: {}, isMatch: true },
        { item: {}, isMatch: false },
      ]
      expect(getDataMismatchIds(context, dataMatches)).toStrictEqual(
        new Set(['11']),
      )
    })

    it("throws if a mismatch can't be mapped to the result", function () {
      const context = { service, result: [{ id: 10 }] } as HookContext
      const dataMatches = [
        { item: {}, isMatch: true },
        { item: {}, isMatch: false },
      ]
      expect(() => getDataMismatchIds(context, dataMatches)).toThrow(
        "Can't map 'context.data' to 'context.result'",
      )
    })
  })
}
