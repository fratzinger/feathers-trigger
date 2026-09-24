import { getResultIsArray } from 'feathers-utils'
import type { HookContext, Params } from '@feathersjs/feathers'
import { getIdField } from './get-id-field.js'
import type { GetOrFindByIdParamsOptions } from './types.js'

/**
 * The params to fetch the items of the call with: before the call to compare
 * them later, after the call to refetch them, if `$select` or manipulated
 * params make `context.result` unfit for that.
 */
export const getOrFindByIdParams = async <H extends HookContext = HookContext>(
  context: H,
  options: GetOrFindByIdParamsOptions<H>,
): Promise<Params | undefined> => {
  if (context.id == null) {
    if (options.type === 'before') {
      let params = {
        ...context.params,
        query: {
          ...context.params?.query,
        },
        paginate: false,
      }

      delete params.changesById

      if (options?.deleteParams) {
        options.deleteParams.forEach((key) => {
          delete params[key]
        })
      }

      if (params.query?.$select) {
        delete params.query.$select
      }

      params =
        typeof options.params === 'function'
          ? await options.params(params, context)
          : params
      return params
    } else if (options.type === 'after') {
      if (!options.params && !context.params.query?.$select) {
        return
      }

      const idField = getIdField(context)

      if (!context.result) {
        return
      }

      const { result: fetchedItems } = getResultIsArray(context)

      const ids = fetchedItems.map((x: any) => x && x[idField])

      let params: Params | null = {
        query: {
          [idField]: { $in: ids },
        },
        paginate: false,
      }

      params = options.params ? await options.params(params, context) : params
      return params ?? {}
    }
  } else {
    if (
      options.type === 'after' &&
      !options.params &&
      !context.params.query?.$select
    ) {
      return
    }

    const query = { ...context.params.query }

    delete query.$select

    let params: Params = { ...context.params, ...{ query } }
    delete params.changesById

    if (options?.deleteParams) {
      options.deleteParams.forEach((key) => {
        delete params[key as keyof typeof params]
      })
    }

    params =
      (typeof options.params === 'function'
        ? await options.params(params, context)
        : params) ?? {}

    return params
  }
}

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest

  const makeContext = (context: Partial<HookContext>) =>
    ({
      method: 'patch',
      id: null,
      params: {},
      service: { options: { id: 'id' } },
      ...context,
    }) as HookContext

  describe('getOrFindByIdParams', function () {
    describe('multi, before', function () {
      it('copies the params without $select, changesById, deleteParams and pagination', async function () {
        const context = makeContext({
          params: {
            query: { test: true, $select: ['id'] },
            changesById: {},
            trigger: {},
            provider: 'rest',
          },
        })

        expect(
          await getOrFindByIdParams(context, {
            type: 'before',
            skipHooks: false,
            deleteParams: ['trigger'],
          }),
        ).toStrictEqual({
          query: { test: true },
          provider: 'rest',
          paginate: false,
        })
        expect(context.params.query.$select, 'keeps context.params').toEqual([
          'id',
        ])
      })

      it('manipulates the params', async function () {
        const context = makeContext({ params: { query: { test: true } } })

        expect(
          await getOrFindByIdParams(context, {
            type: 'before',
            skipHooks: false,
            params: (params) => ({
              ...params,
              query: { ...params.query, extra: 1 },
            }),
          }),
        ).toStrictEqual({ query: { test: true, extra: 1 }, paginate: false })
      })
    })

    describe('multi, after', function () {
      it('returns nothing without params to manipulate and without $select', async function () {
        const context = makeContext({ result: [{ id: 1 }] })

        expect(
          await getOrFindByIdParams(context, {
            type: 'after',
            skipHooks: false,
          }),
        ).toBe(undefined)
      })

      it('queries the items of the result by id', async function () {
        const context = makeContext({
          params: { query: { $select: ['id'] } },
          result: [{ id: 1 }, { id: 2 }],
        })

        expect(
          await getOrFindByIdParams(context, {
            type: 'after',
            skipHooks: false,
          }),
        ).toStrictEqual({ query: { id: { $in: [1, 2] } }, paginate: false })
      })
    })

    describe('single', function () {
      it('copies the params without $select, changesById and deleteParams', async function () {
        const context = makeContext({
          id: 1,
          params: {
            query: { test: true, $select: ['id'] },
            changesById: {},
            trigger: {},
          },
        })

        expect(
          await getOrFindByIdParams(context, {
            type: 'before',
            skipHooks: false,
            deleteParams: ['trigger'],
          }),
        ).toStrictEqual({ query: { test: true } })
      })

      it('returns nothing after without params to manipulate and without $select', async function () {
        const context = makeContext({ id: 1 })

        expect(
          await getOrFindByIdParams(context, {
            type: 'after',
            skipHooks: false,
          }),
        ).toBe(undefined)
      })

      it('falls back to empty params if they are manipulated to null', async function () {
        const context = makeContext({ id: 1 })

        expect(
          await getOrFindByIdParams(context, {
            type: 'before',
            skipHooks: false,
            params: () => null,
          }),
        ).toStrictEqual({})
      })
    })
  })
}
