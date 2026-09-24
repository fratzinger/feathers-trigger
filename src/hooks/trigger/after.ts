import type { HookContext, Id } from '@feathersjs/feathers'
import type { Change } from '../changes-by-id/index.js'
import { changesByIdAfter } from '../changes-by-id/index.js'
import { set } from '../../utils.internal/index.js'
import type { Promisable } from '../../types.internal.js'
import { getConfig } from './config.js'
import { getDataMismatchIds } from './data-matches.js'
import { makeDebug } from './debug.js'
import {
  isSkippedByParams,
  isSubscriptionInBatchMode,
  isSubscriptionNormalMode,
  shouldFetchBefore,
} from './subscriptions.js'
import { testCondition } from './test-condition.js'
import type { ActionOptions, SubscriptionResolved } from './types.js'

export const triggerAfter = async <H extends HookContext>(
  context: H,
  hookId: string,
): Promise<H> => {
  const subs = getConfig(context, hookId)
  if (!subs?.length) {
    return context
  }

  const promises: Promisable<any>[] = []

  for (const sub of subs) {
    const log = makeDebug(sub, context)

    if (isSkippedByParams(sub, context)) {
      log('skipping because of context.params.skipTrigger')
      continue
    }

    const changesById = await getChangesById(sub, context)

    if (!changesById) {
      log('no changesById')
      continue
    }

    const changes = Object.values(changesById)
    const matchingChanges = await filterChanges(sub, changes, context)

    promises.push(...runActions(sub, matchingChanges, changes, context))
  }

  await Promise.all(promises)

  return context
}

/**
 * The changes for the subscription. The first subscription with an identifier
 * computes them from the items before and stores them in place of those, so
 * the other subscriptions with the same identifier reuse them.
 */
const getChangesById = async (
  sub: SubscriptionResolved,
  context: HookContext,
): Promise<Record<Id, Change> | undefined> => {
  if (!sub.identifier) {
    return
  }

  const itemsBefore = context.params.changesById?.[sub.identifier]?.itemsBefore

  if (itemsBefore) {
    makeDebug(sub, context)("fetching after with 'changesByIdAfter'")

    const changesById = await changesByIdAfter(context, itemsBefore, null, {
      name: ['changesById', sub.identifier],
      params: sub.manipulateParams,
      skipHooks: false,
      deleteParams: ['trigger'],
      fetchBefore: shouldFetchBefore(sub),
    })

    set(context, ['params', 'changesById', sub.identifier], changesById)
  }

  return context.params.changesById?.[sub.identifier]
}

/**
 * The changes that match `data` (tested in the before hook), `result` and
 * `before`
 */
const filterChanges = async (
  sub: SubscriptionResolved,
  changes: Change[],
  context: HookContext,
): Promise<Change[]> => {
  const log = makeDebug(sub, context)
  const dataMismatchIds = getDataMismatchIds(context, sub.dataMatches)
  const matchingChanges: Change[] = []

  for (const change of changes) {
    const { item, before } = change

    const id = item?.[context.service.id]
    if (dataMismatchIds?.has(String(id))) {
      log('skipping because of data mismatch', id)
      continue
    }

    if (
      sub.result !== undefined &&
      !(await testCondition({
        item,
        before,
        withBefore: true,
        condition: sub.result,
        context,
      }))
    ) {
      log('skipping because of result mismatch')
      continue
    }

    if (
      sub.before !== undefined &&
      !(await testCondition({
        item,
        before,
        testItem: 'before',
        condition: sub.before,
        context,
      }))
    ) {
      log('skipping because of before mismatch', before)
      continue
    }

    matchingChanges.push(change)
  }

  return matchingChanges
}

/**
 * Runs the action for every matching change, or the batch action once for all
 * of them. Returns what to wait for, which is nothing if the subscription
 * isn't blocking.
 */
const runActions = (
  sub: SubscriptionResolved,
  matchingChanges: Change[],
  changes: Change[],
  context: HookContext,
): Promisable<void>[] => {
  const log = makeDebug(sub, context)
  const promises: Promisable<void>[] = []

  const makeOptions = (): ActionOptions => ({
    subscription: sub,
    items: changes,
    context,
  })

  if (isSubscriptionInBatchMode(sub)) {
    if (matchingChanges.length) {
      const batchActionArguments = matchingChanges.map(
        (change): [Change, ActionOptions] => {
          log('adding to batchActionArguments')
          return [change, makeOptions()]
        },
      )

      log('running batch action')
      promises.push(sub.batchAction(batchActionArguments, context))
    }
  } else if (isSubscriptionNormalMode(sub)) {
    for (const change of matchingChanges) {
      log('running action')
      promises.push(sub.action(change, makeOptions()))
    }
  }

  return sub.isBlocking ? promises : []
}

if (import.meta.vitest) {
  const { describe, it, expect, vi } = import.meta.vitest

  const makeSub = (sub: Partial<SubscriptionResolved>) =>
    ({
      isBlocking: true,
      fetchBefore: false,
      debug: false,
      ...sub,
    }) as SubscriptionResolved

  const context = {
    type: 'after',
    path: 'tests',
    method: 'patch',
    params: {},
    service: { id: 'id' },
  } as HookContext

  describe('filterChanges', function () {
    const action = () => {}
    const changes = [
      { before: { id: 1, count: 1 }, item: { id: 1, count: 2 } },
      { before: { id: 2, count: 2 }, item: { id: 2, count: 2 } },
    ]

    it('keeps every change without conditions', async function () {
      const sub = makeSub({ action })
      expect(await filterChanges(sub, changes, context)).toStrictEqual(changes)
    })

    it('tests result with the item and the item before', async function () {
      const sub = makeSub({
        action,
        result: ({ item, before }) => item.count !== before?.count,
      })
      expect(await filterChanges(sub, changes, context)).toStrictEqual([
        changes[0],
      ])
    })

    it('tests before against the item before', async function () {
      const sub = makeSub({ action, before: { count: 2 } })
      expect(await filterChanges(sub, changes, context)).toStrictEqual([
        changes[1],
      ])
    })

    it("skips the items that didn't match data on multi create", async function () {
      const sub = makeSub({
        action,
        dataMatches: [
          { item: { id: 1 }, isMatch: true },
          { item: { id: 2 }, isMatch: false },
        ],
      })
      expect(await filterChanges(sub, changes, context)).toStrictEqual([
        changes[0],
      ])
    })
  })

  describe('runActions', function () {
    const changes = [
      { before: undefined, item: { id: 1 } },
      { before: undefined, item: { id: 2 } },
    ]

    it('runs the action for every matching change', function () {
      const action = vi.fn()
      const sub = makeSub({ action })
      runActions(sub, [changes[1]], changes, context)
      expect(action).toHaveBeenCalledTimes(1)
      expect(action).toHaveBeenCalledWith(changes[1], {
        subscription: sub,
        items: changes,
        context,
      })
    })

    it('runs the batch action once for all matching changes', function () {
      const batchAction = vi.fn()
      const sub = makeSub({ batchAction })
      runActions(sub, changes, changes, context)
      expect(batchAction).toHaveBeenCalledTimes(1)
      expect(batchAction).toHaveBeenCalledWith(
        changes.map((change) => [
          change,
          { subscription: sub, items: changes, context },
        ]),
        context,
      )
    })

    it("doesn't run the batch action without matching changes", function () {
      const batchAction = vi.fn()
      runActions(makeSub({ batchAction }), [], changes, context)
      expect(batchAction).not.toHaveBeenCalled()
    })

    it('only returns something to wait for if blocking', function () {
      const action = vi.fn(async () => {})
      expect(
        runActions(makeSub({ action }), changes, changes, context),
      ).toHaveLength(2)
      expect(
        runActions(
          makeSub({ action, isBlocking: false }),
          changes,
          changes,
          context,
        ),
      ).toHaveLength(0)
      expect(action).toHaveBeenCalledTimes(4)
    })
  })
}
