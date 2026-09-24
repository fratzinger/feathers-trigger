import type { HookContext } from '@feathersjs/feathers'
import { defaultOptions } from './default-options.js'
import { getOrFindById } from './get-or-find-by-id.js'
import type { HookChangesByIdOptions } from './types.js'

/**
 * The items before the call by id, to compare them after the call. Only
 * fetched with `fetchBefore`, and never on create.
 */
export const changesByIdBefore = async <H extends HookContext>(
  context: H,
  _options: HookChangesByIdOptions<H>,
): Promise<Record<string, unknown> | unknown[]> => {
  const options = {
    ...defaultOptions,
    ..._options,
    type: 'before' as const,
  }

  let byId: Record<string, unknown> | unknown[]

  if (context.method === 'create' || !options.fetchBefore) {
    byId = {}
  } else if (
    context.method === 'update' ||
    context.method === 'patch' ||
    context.method === 'remove'
  ) {
    byId = (await getOrFindById(context, options)) ?? {}
  } else {
    return []
  }

  return byId
}

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest

  const items = [{ id: 1 }, { id: 2 }]

  // without service: fails on every fetch that isn't expected
  const makeContext = (context: Partial<HookContext>) =>
    ({ method: 'patch', id: null, params: {}, ...context }) as HookContext

  describe('changesByIdBefore', function () {
    it("doesn't fetch on create", async function () {
      const context = makeContext({ method: 'create' })

      expect(
        await changesByIdBefore(context, {
          skipHooks: false,
          fetchBefore: true,
        }),
      ).toStrictEqual({})
    })

    it("doesn't fetch without fetchBefore", async function () {
      const context = makeContext({})

      expect(
        await changesByIdBefore(context, { skipHooks: false }),
      ).toStrictEqual({})
    })

    it('fetches the items by id with fetchBefore', async function () {
      const context = makeContext({
        service: { options: { id: 'id' }, find: async () => items },
      })

      expect(
        await changesByIdBefore(context, {
          skipHooks: false,
          fetchBefore: true,
        }),
      ).toStrictEqual({ 1: items[0], 2: items[1] })
    })
  })
}
