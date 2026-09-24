import type { HookContext } from '@feathersjs/feathers'
import type {
  HookTriggerOptions,
  ResolvableBoolean,
  Subscription,
  SubscriptionBase,
  SubscriptionBatchAction,
  SubscriptionResolved,
  SubscriptionSingleAction,
} from './types.js'

/**
 * The subscriptions for the service and method of the call, with
 * `isBlocking`, `fetchBefore` and `debug` resolved
 */
export const getSubscriptions = async <H extends HookContext, T = any>(
  context: H,
  options: HookTriggerOptions<H, T>,
): Promise<undefined | SubscriptionResolved<H, T>[]> => {
  const subscriptionOrSubscriptions =
    typeof options === 'function' ? await options(context) : options

  if (!subscriptionOrSubscriptions) {
    return
  }

  const subscriptions = Array.isArray(subscriptionOrSubscriptions)
    ? subscriptionOrSubscriptions
    : [subscriptionOrSubscriptions]

  // resolved once, before anything else, so the after hook, the debug log and
  // the action all see the same booleans
  return await Promise.all(
    subscriptions
      .filter((sub) => isForServiceAndMethod(sub, context))
      .map((sub) => resolveSubscription(sub, context)),
  )
}

export const isForServiceAndMethod = (
  sub: Pick<SubscriptionBase, 'service' | 'method'>,
  { path, method }: Pick<HookContext, 'path' | 'method'>,
): boolean => {
  if (
    sub.service &&
    ((typeof sub.service === 'string' && sub.service !== path) ||
      (Array.isArray(sub.service) && !sub.service.includes(path)))
  ) {
    return false
  }
  if (
    sub.method &&
    ((typeof sub.method === 'string' && sub.method !== method) ||
      (Array.isArray(sub.method) && !sub.method.includes(method)))
  ) {
    return false
  }

  return true
}

const resolveSubscription = async <H extends HookContext, T>(
  sub: Subscription<H, T>,
  context: H,
): Promise<SubscriptionResolved<H, T>> =>
  ({
    ...sub,
    isBlocking: await resolveBoolean(sub.isBlocking, context, true),
    fetchBefore: await resolveBoolean(sub.fetchBefore, context, false),
    debug: await resolveBoolean(sub.debug, context, false),
  }) as SubscriptionResolved<H, T>

export const resolveBoolean = async <H extends HookContext>(
  value: ResolvableBoolean<H> | undefined,
  context: H,
  defaultValue: boolean,
): Promise<boolean> => {
  if (value === undefined) {
    return defaultValue
  }

  return !!(typeof value === 'function' ? await value(context) : value)
}

/**
 * Whether the subscription is skipped by its name in
 * `context.params.skipTrigger`
 */
export const isSkippedByParams = (
  sub: Pick<SubscriptionBase, 'name'>,
  context: Pick<HookContext, 'params'>,
): boolean => {
  const { skipTrigger } = context.params

  return !!(
    sub.name &&
    skipTrigger &&
    (skipTrigger === sub.name ||
      (Array.isArray(skipTrigger) && skipTrigger.includes(sub.name)))
  )
}

/**
 * A `before` condition needs the items before, so it implies `fetchBefore`.
 * Used in the before and the after hook, so both work with the same items.
 */
export const shouldFetchBefore = (
  sub: Pick<SubscriptionResolved<any, any>, 'fetchBefore' | 'before'>,
): boolean => !!sub.fetchBefore || !!sub.before

export const isSubscriptionInBatchMode = (
  sub: Subscription,
): sub is SubscriptionBatchAction => 'batchAction' in sub

export const isSubscriptionNormalMode = (
  sub: Subscription,
): sub is SubscriptionSingleAction => 'action' in sub

if (import.meta.vitest) {
  const { describe, it, expect, vi } = import.meta.vitest

  const action = () => {}

  describe('getSubscriptions', function () {
    const context = {
      path: 'tests',
      method: 'create',
      params: {},
    } as HookContext

    it('wraps a single subscription and resolves the defaults', async function () {
      expect(await getSubscriptions(context, { action })).toStrictEqual([
        { action, isBlocking: true, fetchBefore: false, debug: false },
      ])
    })

    it('calls a function with the context', async function () {
      const options = vi.fn((_context: HookContext) => [{ action }])
      expect(await getSubscriptions(context, options)).toHaveLength(1)
      expect(options).toHaveBeenCalledWith(context)
    })

    it('returns undefined if a function returns nothing', async function () {
      expect(await getSubscriptions(context, () => undefined as any)).toBe(
        undefined,
      )
    })

    it('only returns the subscriptions for the service and method', async function () {
      const subs = await getSubscriptions(context, [
        { name: 'match', service: 'tests', method: 'create', action },
        { name: 'other service', service: 'others', action },
        { name: 'other method', method: 'patch', action },
      ])
      expect(subs?.map((sub) => sub.name)).toStrictEqual(['match'])
    })

    it('resolves isBlocking, fetchBefore and debug from the context', async function () {
      const subs = await getSubscriptions(context, {
        action,
        isBlocking: (context) => context.method !== 'create',
        fetchBefore: async () => true,
        debug: true,
      })
      expect(subs?.[0]).toMatchObject({
        isBlocking: false,
        fetchBefore: true,
        debug: true,
      })
    })
  })

  describe('isForServiceAndMethod', function () {
    const context = { path: 'tests', method: 'patch' }

    it('matches every call without service and method', function () {
      expect(isForServiceAndMethod({}, context)).toBe(true)
    })

    it('matches the service by name or by a list of names', function () {
      expect(isForServiceAndMethod({ service: 'tests' }, context)).toBe(true)
      expect(isForServiceAndMethod({ service: 'others' }, context)).toBe(false)
      expect(
        isForServiceAndMethod({ service: ['others', 'tests'] }, context),
      ).toBe(true)
      expect(isForServiceAndMethod({ service: ['others'] }, context)).toBe(
        false,
      )
    })

    it('matches the method by name or by a list of names', function () {
      expect(isForServiceAndMethod({ method: 'patch' }, context)).toBe(true)
      expect(isForServiceAndMethod({ method: 'create' }, context)).toBe(false)
      expect(
        isForServiceAndMethod({ method: ['create', 'patch'] }, context),
      ).toBe(true)
      expect(isForServiceAndMethod({ method: ['create'] }, context)).toBe(false)
    })
  })

  describe('resolveBoolean', function () {
    const context = {} as HookContext

    it('falls back to the default', async function () {
      expect(await resolveBoolean(undefined, context, true)).toBe(true)
      expect(await resolveBoolean(undefined, context, false)).toBe(false)
    })

    it('returns a boolean as is', async function () {
      expect(await resolveBoolean(false, context, true)).toBe(false)
      expect(await resolveBoolean(true, context, false)).toBe(true)
    })

    it('calls a function with the context', async function () {
      const value = vi.fn(async (_context: HookContext) => true)
      expect(await resolveBoolean(value, context, false)).toBe(true)
      expect(value).toHaveBeenCalledWith(context)
    })
  })

  describe('isSkippedByParams', function () {
    it('skips a subscription by its name', function () {
      const context = { params: { skipTrigger: 'a' } }
      expect(isSkippedByParams({ name: 'a' }, context)).toBe(true)
      expect(isSkippedByParams({ name: 'b' }, context)).toBe(false)
    })

    it('skips a subscription by a list of names', function () {
      const context = { params: { skipTrigger: ['a', 'b'] } }
      expect(isSkippedByParams({ name: 'b' }, context)).toBe(true)
      expect(isSkippedByParams({ name: 'c' }, context)).toBe(false)
    })

    it('never skips a subscription without a name', function () {
      const context = { params: { skipTrigger: 'a' } }
      expect(isSkippedByParams({}, context)).toBe(false)
    })
  })

  describe('shouldFetchBefore', function () {
    it('fetches before with fetchBefore or a before condition', function () {
      expect(shouldFetchBefore({ fetchBefore: false })).toBe(false)
      expect(shouldFetchBefore({ fetchBefore: true })).toBe(true)
      expect(
        shouldFetchBefore({ fetchBefore: false, before: { count: 1 } }),
      ).toBe(true)
    })
  })
}
