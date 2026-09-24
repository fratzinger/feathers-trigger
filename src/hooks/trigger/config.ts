import type { HookContext } from '@feathersjs/feathers'
import type { SubscriptionResolved } from './types.js'

const CONFIG_KEY = 'subscriptions' as const

/**
 * Stores the subscriptions that are left after the before hook, for the after
 * hook of the same `trigger()`. Every `trigger()` has its own `hookId`.
 */
export function setConfig(
  context: HookContext,
  hookId: string,
  val: SubscriptionResolved<any, any>[],
): void {
  context.params.trigger = context.params.trigger || {}
  context.params.trigger[CONFIG_KEY] = context.params.trigger[CONFIG_KEY] || {}
  context.params.trigger[CONFIG_KEY][hookId] = val
}

export function getConfig(
  context: HookContext,
  hookId: string,
): SubscriptionResolved<any, any>[] | undefined {
  return context.params.trigger?.[CONFIG_KEY]?.[hookId]
}

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest

  const makeSub = (name: string): SubscriptionResolved => ({
    name,
    action: () => {},
    isBlocking: true,
    fetchBefore: false,
    debug: false,
  })

  describe('config', function () {
    it('returns undefined if nothing is stored', function () {
      const context = { params: {} } as HookContext
      expect(getConfig(context, '0')).toBe(undefined)
    })

    it('keeps the subscriptions of every hook apart', function () {
      const context = { params: {} } as HookContext
      const sub0 = makeSub('sub0')
      const sub1 = makeSub('sub1')

      setConfig(context, '0', [sub0])
      setConfig(context, '1', [sub1])

      expect(getConfig(context, '0')).toStrictEqual([sub0])
      expect(getConfig(context, '1')).toStrictEqual([sub1])
    })
  })
}
