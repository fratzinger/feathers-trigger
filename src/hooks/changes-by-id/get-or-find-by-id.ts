import type { HookContext, Id } from '@feathersjs/feathers'
import { getIdField } from './get-id-field.js'
import { getOrFindByIdParams } from './get-or-find-by-id-params.js'
import type { GetOrFindByIdOptions } from './types.js'

/**
 * Fetches the items of the call: with `get` on single, with `find` on multi.
 * Returns them by id, or as list with `byId: false`.
 */
export const getOrFindById = async <H extends HookContext, T>(
  context: H,
  _options: GetOrFindByIdOptions<H>,
): Promise<Record<Id, T> | T[] | undefined> => {
  const options = {
    byId: true,
    ..._options,
  }

  let itemOrItems
  const idField = getIdField(context)

  const params = await getOrFindByIdParams(context, options)

  if (context.id == null) {
    const method = options.skipHooks ? '_find' : 'find'

    itemOrItems = await context.service[method](params)

    itemOrItems = itemOrItems && (itemOrItems.data || itemOrItems)
  } else {
    const method = options.skipHooks ? '_get' : 'get'

    itemOrItems = await context.service[method](context.id, params)
  }

  const items = !itemOrItems
    ? []
    : Array.isArray(itemOrItems)
      ? itemOrItems
      : [itemOrItems]

  if (options.byId) {
    return items.reduce((byId, item) => {
      const id = item[idField]
      byId[id] = item
      return byId
    }, {})
  } else {
    return items
  }
}

if (import.meta.vitest) {
  const { describe, it, expect, vi } = import.meta.vitest

  const items = [{ id: 1 }, { id: 2 }]

  const makeContext = (context: Partial<HookContext>) =>
    ({
      method: 'patch',
      id: null,
      params: {},
      service: {
        options: { id: 'id' },
        find: vi.fn(async () => ({ total: 2, data: items })),
        _find: vi.fn(async () => items),
        get: vi.fn(async (id: Id) => items.find((item) => item.id === id)),
        _get: vi.fn(async (id: Id) => items.find((item) => item.id === id)),
      },
      ...context,
    }) as HookContext

  describe('getOrFindById', function () {
    it('finds the items on multi and returns them by id', async function () {
      const context = makeContext({})

      expect(
        await getOrFindById(context, { type: 'before', skipHooks: false }),
      ).toStrictEqual({ 1: items[0], 2: items[1] })
      expect(context.service.find).toHaveBeenCalledWith({
        query: {},
        paginate: false,
      })
    })

    it('gets the item on single', async function () {
      const context = makeContext({ id: 2 })

      expect(
        await getOrFindById(context, { type: 'before', skipHooks: false }),
      ).toStrictEqual({ 2: items[1] })
      expect(context.service.get).toHaveBeenCalledWith(2, { query: {} })
    })

    it('skips the hooks with skipHooks', async function () {
      const context = makeContext({})

      await getOrFindById(context, { type: 'before', skipHooks: true })

      expect(context.service._find).toHaveBeenCalled()
      expect(context.service.find).not.toHaveBeenCalled()
    })

    it('returns the items as list with byId: false', async function () {
      const context = makeContext({})

      expect(
        await getOrFindById(context, {
          type: 'before',
          skipHooks: false,
          byId: false,
        }),
      ).toStrictEqual(items)
    })
  })
}
