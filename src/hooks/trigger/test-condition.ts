import sift from 'sift'
import type { HookContext } from '@feathersjs/feathers'
import type { Condition, ConditionChange } from './types.js'

export type TestConditionOptions = {
  item: any
  testItem?: 'item' | 'before'
  before?: any
  withBefore?: boolean
  condition: Condition | ConditionChange | undefined
  context: HookContext
}

/**
 * Tests a condition of a subscription. A function is called first, a query
 * object is tested with sift.
 */
export const testCondition = async (
  options: TestConditionOptions,
): Promise<boolean> => {
  if (options.condition === undefined) {
    return true
  }

  const { item, before, context, testItem = 'item' } = options

  let condition: Record<string, any> | boolean

  if (typeof options.condition === 'function') {
    const data = options.withBefore ? { item, before } : item
    condition = await options.condition(data, context)
  } else {
    condition = options.condition
  }

  if (typeof condition === 'boolean') {
    return condition
  }

  const sifter = (sift as any)(condition)

  return sifter(options[testItem])
}

if (import.meta.vitest) {
  const { describe, it, expect, vi } = import.meta.vitest

  const context = { path: 'tests', method: 'patch' } as HookContext

  describe('testCondition', function () {
    it('passes without a condition', async function () {
      expect(
        await testCondition({ condition: undefined, item: {}, context }),
      ).toBe(true)
    })

    it('returns a boolean as is', async function () {
      expect(await testCondition({ condition: true, item: {}, context })).toBe(
        true,
      )
      expect(await testCondition({ condition: false, item: {}, context })).toBe(
        false,
      )
    })

    it('tests a query object against the item', async function () {
      const condition = { count: { $gt: 1 } }
      expect(
        await testCondition({ condition, item: { count: 2 }, context }),
      ).toBe(true)
      expect(
        await testCondition({ condition, item: { count: 1 }, context }),
      ).toBe(false)
    })

    it("tests a query object against 'before' with testItem 'before'", async function () {
      const options = {
        condition: { count: 1 },
        item: { count: 2 },
        before: { count: 1 },
        context,
      }
      expect(await testCondition(options)).toBe(false)
      expect(await testCondition({ ...options, testItem: 'before' })).toBe(true)
    })

    it('calls a function with the item and the context', async function () {
      const condition = vi.fn((_item: any, _context: HookContext) => true)
      const item = { count: 1 }
      expect(await testCondition({ condition, item, context })).toBe(true)
      expect(condition).toHaveBeenCalledWith(item, context)
    })

    it('calls a function with item and before with withBefore', async function () {
      const condition = vi.fn((_change: any, _context: HookContext) => true)
      const item = { count: 2 }
      const before = { count: 1 }
      await testCondition({
        condition,
        item,
        before,
        withBefore: true,
        context,
      })
      expect(condition).toHaveBeenCalledWith({ item, before }, context)
    })

    it('tests a query object returned by a function', async function () {
      const condition = async (item: any) => ({ count: item.limit })
      expect(
        await testCondition({
          condition,
          item: { count: 2, limit: 2 },
          context,
        }),
      ).toBe(true)
      expect(
        await testCondition({
          condition,
          item: { count: 1, limit: 2 },
          context,
        }),
      ).toBe(false)
    })
  })
}
