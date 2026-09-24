import type { HookContext, Id } from '@feathersjs/feathers'
import { defaultOptions } from './default-options.js'
import { resultById } from './result-by-id.js'
import type { Change, HookChangesByIdOptions } from './types.js'

/**
 * Pairs every item after the call with its item before by id, and calls `cb`
 * with the changes
 */
export const changesByIdAfter = async <H extends HookContext, T = any>(
  context: H,
  itemsBefore: any,
  cb?:
    | ((changesById: Record<Id, Change<T>>, context: H) => void | Promise<void>)
    | null,
  _options?: HookChangesByIdOptions<H>,
): Promise<Record<Id, Change> | undefined> => {
  if (!itemsBefore) {
    return
  }

  const options = {
    ...defaultOptions,
    ..._options,
    type: 'after' as const,
  }

  const items = await resultById(context, options)

  if (!items) {
    return
  }
  const itemsBeforeOrAfter =
    context.method === 'remove' && options.fetchBefore ? itemsBefore : items

  const changesById = Object.keys(itemsBeforeOrAfter).reduce(
    (result: Record<Id, Change>, id: string): Record<Id, Change> => {
      if (
        options.fetchBefore &&
        ((context.method !== 'create' && !itemsBefore[id]) ||
          (context.method !== 'remove' && !items[id]))
      ) {
        throw new Error('Mismatch!')
        //return result;
      }

      const before = itemsBefore[id]
      const item = items[id]

      result[id] = {
        before: before,
        item: item,
      }

      return result
    },
    {},
  )

  if (cb && typeof cb === 'function') {
    await cb(changesById as Record<Id, Change<T>>, context)
  }

  return changesById
}

if (import.meta.vitest) {
  const { describe, it, expect, vi } = import.meta.vitest

  const makeContext = (context: Partial<HookContext>) =>
    ({
      method: 'patch',
      id: null,
      params: {},
      service: { id: 'id', options: { id: 'id' } },
      ...context,
    }) as HookContext

  const options = { skipHooks: false, fetchBefore: true }

  describe('changesByIdAfter', function () {
    it('returns nothing without items before', async function () {
      expect(await changesByIdAfter(makeContext({}), undefined)).toBe(undefined)
    })

    it('pairs every item with its item before', async function () {
      const context = makeContext({
        result: [
          { id: 1, count: 2 },
          { id: 2, count: 3 },
        ],
      })
      const itemsBefore = { 1: { id: 1, count: 1 }, 2: { id: 2, count: 2 } }

      expect(
        await changesByIdAfter(context, itemsBefore, null, options),
      ).toStrictEqual({
        1: { before: { id: 1, count: 1 }, item: { id: 1, count: 2 } },
        2: { before: { id: 2, count: 2 }, item: { id: 2, count: 3 } },
      })
    })

    it('has no item before without fetchBefore', async function () {
      const context = makeContext({ method: 'create', result: { id: 1 } })

      expect(await changesByIdAfter(context, {})).toStrictEqual({
        1: { before: undefined, item: { id: 1 } },
      })
    })

    it('takes the ids from the items before on remove', async function () {
      const context = makeContext({ method: 'remove', result: [] })

      expect(
        await changesByIdAfter(context, { 1: { id: 1 } }, null, options),
      ).toStrictEqual({ 1: { before: { id: 1 }, item: undefined } })
    })

    it('throws if an item before is missing with fetchBefore', async function () {
      const context = makeContext({ result: [{ id: 1 }] })

      await expect(
        changesByIdAfter(context, {}, null, options),
      ).rejects.toThrow('Mismatch!')
    })

    it('calls cb with the changes and the context', async function () {
      const cb = vi.fn()
      const context = makeContext({ method: 'create', result: { id: 1 } })

      const changes = await changesByIdAfter(context, {}, cb)

      expect(cb).toHaveBeenCalledWith(changes, context)
    })
  })
}
