import type { Application } from '@feathersjs/feathers'
import { feathers } from '@feathersjs/feathers'
import type { Mock } from 'vitest'
import { MemoryService } from '@feathersjs/memory'
import type { Subscription } from '../../src/index.js'
import { trigger } from '../../src/index.js'

type Mode = 'before-after' | 'around'

const modes: Mode[] = ['before-after', 'around']

/**
 * Multiple `trigger()` hooks registered next to each other in the same
 * `service.hooks()` call:
 * - every hook runs its own subscriptions exactly once
 * - the `before` items are fetched only once and shared between all hooks
 */
describe('trigger-multiple-hooks.test.ts', function () {
  let app: Application
  let service: any

  /** one spy per registered `trigger()` hook */
  let actions: Mock[]
  let find: Mock
  let get: Mock

  /** the `before` that the action of hook `i` received on its first call */
  function beforeOf(i: number) {
    return actions[i].mock.calls[0][0].before
  }

  function counts() {
    return { find: find.mock.calls.length, get: get.mock.calls.length }
  }

  /**
   * registers one `trigger()` hook per entry of `subscriptions` - so
   * `mock('around', [sub1, sub2])` results in `[trigger(sub1), trigger(sub2)]`
   */
  function mock(mode: Mode, subscriptions: Partial<Subscription>[]) {
    app = feathers()
    app.use('/tests', new MemoryService({ multi: true, startId: 1 }))
    service = app.service('tests')

    actions = subscriptions.map((_, i) => vi.fn().mockName(`action hook${i}`))
    find = vi.fn().mockName('service.find')
    get = vi.fn().mockName('service.get')

    const hooks = subscriptions.map((sub, i) =>
      trigger({
        name: `hook${i}`,
        ...sub,
        action: actions[i],
      } as Subscription),
    )

    const counters = { find: [find], get: [get] }

    if (mode === 'around') {
      service.hooks({
        before: counters,
        around: { create: hooks, patch: hooks, remove: hooks },
      })
    } else {
      service.hooks({
        before: { ...counters, create: hooks, patch: hooks, remove: hooks },
        after: { create: hooks, patch: hooks, remove: hooks },
      })
    }
  }

  modes.forEach((mode) => {
    describe(mode, function () {
      it('runs the action of every trigger hook once', async function () {
        mock(mode, [{}, {}])

        const item = await service.create({ test: true })
        expect(actions[0]).toHaveBeenCalledTimes(1)
        expect(actions[1]).toHaveBeenCalledTimes(1)

        vi.clearAllMocks()

        await service.patch(item.id, { test: false })
        expect(actions[0]).toHaveBeenCalledTimes(1)
        expect(actions[1]).toHaveBeenCalledTimes(1)
      })

      it("fetches 'before' only once, no matter how many trigger hooks", async function () {
        // the counts of a single hook are the baseline - adding more trigger
        // hooks with the same params must not add a single find/get
        const byId: Record<number, ReturnType<typeof counts>> = {}
        const byNull: Record<number, ReturnType<typeof counts>> = {}

        for (const hookAmount of [1, 2, 3]) {
          mock(
            mode,
            Array.from({ length: hookAmount }, () => ({ fetchBefore: true })),
          )

          const item = await service.create({ test: true })

          vi.clearAllMocks()
          await service.patch(item.id, { test: false })
          actions.forEach((action) => expect(action).toHaveBeenCalledTimes(1))
          byId[hookAmount] = counts()

          vi.clearAllMocks()
          await service.patch(null, { test: true })
          actions.forEach((action) => expect(action).toHaveBeenCalledTimes(1))
          byNull[hookAmount] = counts()
        }

        expect(byId[1]).toStrictEqual({ find: 0, get: 1 })
        expect(byId[2]).toStrictEqual(byId[1])
        expect(byId[3]).toStrictEqual(byId[1])

        expect(byNull[1]).toStrictEqual({ find: 1, get: 0 })
        expect(byNull[2]).toStrictEqual(byNull[1])
        expect(byNull[3]).toStrictEqual(byNull[1])
      })

      it("passes the same 'before' to every trigger hook", async function () {
        mock(mode, [{ fetchBefore: true }, { fetchBefore: true }])

        const item = await service.create({ test: true })

        vi.clearAllMocks()
        await service.patch(item.id, { test: false })

        expect(actions[0]).toHaveBeenCalledTimes(1)
        expect(actions[1]).toHaveBeenCalledTimes(1)
        expect(beforeOf(0)).toStrictEqual({ id: item.id, test: true })
        // the second hook reuses the object of the first one
        expect(beforeOf(1)).toBe(beforeOf(0))
        expect(counts()).toStrictEqual({ find: 0, get: 1 })
      })

      it("manipulateParams: 'before' is still fetched only once", async function () {
        const manipulateParams = (params: any) => {
          params.$populateParams = { name: 'all' }
          return params
        }

        // baseline with a single hook: 1 get to fetch 'before',
        // 1 get to re-fetch the result, because of manipulateParams
        mock(mode, [{ fetchBefore: true, manipulateParams }])
        const item = await service.create({ test: true })
        vi.clearAllMocks()
        await service.patch(item.id, { test: false })
        expect(counts()).toStrictEqual({ find: 0, get: 2 })

        mock(mode, [
          { fetchBefore: true, manipulateParams },
          { fetchBefore: true, manipulateParams },
        ])
        const item2 = await service.create({ test: true })
        vi.clearAllMocks()
        await service.patch(item2.id, { test: false })

        expect(actions[0]).toHaveBeenCalledTimes(1)
        expect(actions[1]).toHaveBeenCalledTimes(1)
        // the second hook adds no find/get at all
        expect(counts()).toStrictEqual({ find: 0, get: 2 })
        expect(beforeOf(1)).toBe(beforeOf(0))
      })
    })
  })
})
