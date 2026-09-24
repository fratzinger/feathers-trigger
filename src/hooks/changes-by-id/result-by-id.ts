import { dequal } from 'dequal'
import type { HookContext, Id, Params } from '@feathersjs/feathers'
import { getOrFindById } from './get-or-find-by-id.js'
import { getOrFindByIdParams } from './get-or-find-by-id-params.js'
import type { GetOrFindByIdParamsOptions } from './types.js'

/**
 * The items after the call by id: from `context.result`, or refetched if
 * `$select` or manipulated params make `context.result` unfit for that
 */
export const resultById = async <H extends HookContext>(
  context: H,
  options: GetOrFindByIdParamsOptions<H>,
): Promise<Record<string, unknown>> => {
  if (!context.result) {
    return {}
  }

  let items: Record<string, unknown>[]
  let params: Params | null | undefined = await getOrFindByIdParams(
    context,
    options,
  )

  if (params) {
    const contextParams = { ...context.params }
    delete contextParams.changesById
    if (options?.deleteParams) {
      options.deleteParams.forEach((key) => {
        delete contextParams[key]
      })
    }

    if (dequal(params, context.params)) {
      params = null
    }
  }

  if (context.method === 'remove' || !params) {
    let itemOrItems = context.result
    itemOrItems = Array.isArray(itemOrItems.data)
      ? itemOrItems.data
      : itemOrItems
    items = Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems]
  } else {
    items = (await getOrFindById(context, {
      skipHooks: options?.skipHooks ?? false,
      byId: false,
      params: () => params,
      type: options.type,
    })) as Record<string, unknown>[]
  }

  const idField = context.service.id

  return items.reduce(
    (
      byId: Record<Id, Record<string, unknown>>,
      item: Record<string, unknown>,
    ) => {
      const id = item[idField] as Id
      byId[id] = item
      return byId
    },
    {},
  )
}

if (import.meta.vitest) {
  const { describe, it, expect, vi } = import.meta.vitest

  const items = [
    { id: 1, test: true },
    { id: 2, test: false },
  ]

  const makeContext = (context: Partial<HookContext>) =>
    ({
      method: 'patch',
      id: null,
      params: {},
      service: {
        id: 'id',
        options: { id: 'id' },
        find: vi.fn(async () => items),
      },
      ...context,
    }) as HookContext

  const options = { type: 'after', skipHooks: false } as const

  describe('resultById', function () {
    it('returns nothing without result', async function () {
      expect(await resultById(makeContext({}), options)).toStrictEqual({})
    })

    it('maps the result by id', async function () {
      const context = makeContext({ result: items })

      expect(await resultById(context, options)).toStrictEqual({
        1: items[0],
        2: items[1],
      })
      expect(context.service.find).not.toHaveBeenCalled()
    })

    it('maps a single or paginated result by id', async function () {
      expect(
        await resultById(makeContext({ id: 1, result: items[0] }), options),
      ).toStrictEqual({ 1: items[0] })
      expect(
        await resultById(
          makeContext({ result: { total: 2, data: items } }),
          options,
        ),
      ).toStrictEqual({ 1: items[0], 2: items[1] })
    })

    it('refetches the items with $select', async function () {
      const context = makeContext({
        params: { query: { $select: ['id'] } },
        result: [{ id: 1 }, { id: 2 }],
      })

      expect(await resultById(context, options)).toStrictEqual({
        1: items[0],
        2: items[1],
      })
      expect(context.service.find).toHaveBeenCalledWith({
        query: { id: { $in: [1, 2] } },
        paginate: false,
      })
    })

    it("doesn't refetch the removed items", async function () {
      const context = makeContext({
        method: 'remove',
        params: { query: { $select: ['id'] } },
        result: [{ id: 1 }],
      })

      expect(await resultById(context, options)).toStrictEqual({
        1: { id: 1 },
      })
      expect(context.service.find).not.toHaveBeenCalled()
    })
  })
}
