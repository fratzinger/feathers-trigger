import type { HookContext } from '@feathersjs/feathers'
import {
  changesByIdBefore,
  getOrFindByIdParams,
} from '../changes-by-id/index.js'
import { set } from '../../utils.internal/index.js'
import { setConfig } from './config.js'
import { getDataMatches } from './data-matches.js'
import { makeDebug } from './debug.js'
import {
  getSubscriptions,
  isSkippedByParams,
  shouldFetchBefore,
} from './subscriptions.js'
import { testCondition } from './test-condition.js'
import type { HookTriggerOptions, SubscriptionResolved } from './types.js'

export const triggerBefore = async <
  H extends HookContext,
  T = Record<string, any>,
>(
  context: H,
  options: HookTriggerOptions<H, T>,
  hookId: string,
): Promise<H> => {
  const subs = await getSubscriptions(context, options)

  if (!subs?.length) {
    return context
  }

  const isMatch = await Promise.all(
    subs.map((sub) => isMatchingBefore(sub, context)),
  )
  const subsLeft = subs.filter((_, i) => isMatch[i])

  if (!subsLeft.length) {
    if (subs.some((sub) => sub.debug)) {
      console.log(
        '[FEATHERS_TRIGGER DEBUG]',
        context.path,
        context.method,
        'skipping because no subscriptions left',
      )
    }
    return context
  }

  for (const sub of subsLeft) {
    await fetchItemsBefore(sub, context)
  }

  setConfig(context, hookId, subsLeft)

  return context
}

/**
 * Whether the subscription applies to the call, as far as it can be told
 * before the call. On multi create, it stores in `sub.dataMatches` which items
 * matched `data`, if only some of them did.
 */
const isMatchingBefore = async <H extends HookContext, T>(
  sub: SubscriptionResolved<H, T>,
  context: H,
): Promise<boolean> => {
  const log = makeDebug(sub, context)

  if (!('action' in sub) && !('batchAction' in sub)) {
    log('skipping because no action provided')
    return false
  }

  if (isSkippedByParams(sub, context)) {
    log('skipping because of context.params.skipTrigger')
    return false
  }

  if (sub.data !== undefined) {
    const dataMatches = await getDataMatches(sub.data, context)

    if (!dataMatches.some(({ isMatch }) => isMatch)) {
      log('skipping because of data mismatch')
      return false
    }

    if (!dataMatches.every(({ isMatch }) => isMatch)) {
      sub.dataMatches = dataMatches
    }
  }

  if (
    sub.params !== undefined &&
    !(await testCondition({
      condition: sub.params,
      item: context.params,
      context,
    }))
  ) {
    log('skipping because of params mismatch')
    return false
  }

  return true
}

/**
 * Fetches the items before the call for the subscription, unless another
 * subscription already fetched them the same way
 */
const fetchItemsBefore = async <H extends HookContext, T>(
  sub: SubscriptionResolved<H, T>,
  context: H,
): Promise<void> => {
  const log = makeDebug(sub, context)

  sub.paramsResolved =
    (await getOrFindByIdParams(context, {
      params: sub.manipulateParams,
      deleteParams: ['trigger'],
      type: 'before',
      skipHooks: false,
    })) ?? {}

  const fetchBefore = shouldFetchBefore(sub)

  // subs only share the 'before' items if they fetch them the same way,
  // otherwise a sub without `fetchBefore` leaves an empty 'before' for the others
  sub.identifier = JSON.stringify({
    query: sub.paramsResolved.query || {},
    fetchBefore,
  })
  if (context.params.changesById?.[sub.identifier]?.itemsBefore) {
    return
  }

  log("fetching before with 'changesByIdBefore'")

  const before = await changesByIdBefore(context, {
    skipHooks: false,
    params: () => (sub.paramsResolved ? sub.paramsResolved : null),
    deleteParams: ['trigger'],
    fetchBefore,
  })

  set(context, ['params', 'changesById', sub.identifier, 'itemsBefore'], before)
}

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest

  const makeSub = (sub: Partial<SubscriptionResolved>) =>
    ({
      action: () => {},
      isBlocking: true,
      fetchBefore: false,
      debug: false,
      ...sub,
    }) as SubscriptionResolved

  const makeContext = (context: Partial<HookContext>) =>
    ({
      type: 'before',
      path: 'tests',
      method: 'create',
      params: {},
      ...context,
    }) as HookContext

  describe('isMatchingBefore', function () {
    it('matches a subscription without conditions', async function () {
      expect(await isMatchingBefore(makeSub({}), makeContext({}))).toBe(true)
    })

    it("doesn't match a subscription without action", async function () {
      const sub = makeSub({})
      delete (sub as any).action
      expect(await isMatchingBefore(sub, makeContext({}))).toBe(false)
    })

    it("doesn't match a subscription skipped by params.skipTrigger", async function () {
      const context = makeContext({ params: { skipTrigger: 'sub1' } })
      expect(await isMatchingBefore(makeSub({ name: 'sub1' }), context)).toBe(
        false,
      )
    })

    it("doesn't match if no item matches data", async function () {
      const context = makeContext({ data: [{ count: 1 }, { count: 2 }] })
      const sub = makeSub({ data: { count: 3 } })
      expect(await isMatchingBefore(sub, context)).toBe(false)
    })

    it('stores which items matched data, if only some did', async function () {
      const context = makeContext({ data: [{ count: 1 }, { count: 2 }] })
      const sub = makeSub({ data: { count: 1 } })
      expect(await isMatchingBefore(sub, context)).toBe(true)
      expect(sub.dataMatches).toStrictEqual([
        { item: { count: 1 }, isMatch: true },
        { item: { count: 2 }, isMatch: false },
      ])
    })

    it("doesn't store dataMatches if every item matched", async function () {
      const context = makeContext({ data: [{ count: 1 }, { count: 1 }] })
      const sub = makeSub({ data: { count: 1 } })
      expect(await isMatchingBefore(sub, context)).toBe(true)
      expect(sub.dataMatches).toBe(undefined)
    })

    it('tests params against context.params', async function () {
      const sub = makeSub({ params: { provider: 'rest' } })
      expect(
        await isMatchingBefore(
          sub,
          makeContext({ params: { provider: 'rest' } }),
        ),
      ).toBe(true)
      expect(await isMatchingBefore(sub, makeContext({ params: {} }))).toBe(
        false,
      )
    })
  })
}
