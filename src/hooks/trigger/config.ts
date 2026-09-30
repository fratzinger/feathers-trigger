import type { HookContext, Id, Query } from '@feathersjs/feathers'
import type { Change } from '../changes-by-id/index.js'
import type { SubscriptionResolved } from './types.js'

/**
 * The items before the call, fetched once for all subscriptions that fetch
 * them with equal queries
 */
export type FetchGroup = {
  /** a snapshot of the query the items were fetched with */
  query: Query
  fetchBefore: boolean
  itemsBefore: Record<Id, any>
  /** the changes of the call, computed once for the whole group */
  changes?: Promise<Record<Id, Change> | undefined>
}

type CallState = {
  /** the subscriptions left after the before hook, per `trigger()` hook */
  subscriptions: Record<string, SubscriptionResolved<any, any>[]>
  fetchGroups: FetchGroup[]
  /** the fetch group of every subscription */
  fetchGroupOf: Map<SubscriptionResolved<any, any>, FetchGroup>
}

/**
 * Keyed by the context, which lives exactly as long as the call. `params` would
 * leak: callers reuse one `params` object for concurrent calls and pass
 * `{ ...context.params }` on to nested calls.
 */
const callStates = new WeakMap<HookContext, CallState>()

/**
 * The state that the `trigger()` hooks of one call share between their before
 * and after hook
 */
export function getCallState(context: HookContext): CallState {
  let state = callStates.get(context)
  if (!state) {
    state = { subscriptions: {}, fetchGroups: [], fetchGroupOf: new Map() }
    callStates.set(context, state)
  }
  return state
}

/**
 * Stores the subscriptions that are left after the before hook, for the after
 * hook of the same `trigger()`. Every `trigger()` has its own `hookId`.
 */
export function setConfig(
  context: HookContext,
  hookId: string,
  val: SubscriptionResolved<any, any>[],
): void {
  getCallState(context).subscriptions[hookId] = val
}

export function getConfig(
  context: HookContext,
  hookId: string,
): SubscriptionResolved<any, any>[] | undefined {
  return callStates.get(context)?.subscriptions[hookId]
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

    it('keeps calls with the same params apart', function () {
      const params = {}
      const sub0 = makeSub('sub0')

      setConfig({ params } as HookContext, '0', [sub0])

      expect(getConfig({ params } as HookContext, '0')).toBe(undefined)
      expect(params).toStrictEqual({})
    })
  })
}
