import type { Application } from '@feathersjs/feathers'
import { feathers } from '@feathersjs/feathers'
import { MemoryService } from '@feathersjs/memory'
import type { Mock } from 'vitest'
import type { Subscription } from './types.js'
import { trigger } from './trigger.js'

type Mode = 'before-after' | 'around'

const modes: Mode[] = ['before-after', 'around']

/**
 * The state a `trigger()` keeps between its before and after phase belongs to
 * the call, not to the `params` object the caller passed in - callers reuse one
 * `params` object for concurrent calls, and pass `{ ...context.params }` on to
 * nested calls.
 */
describe('trigger-shared-params.test.ts', function () {
  let app: Application

  function use(path: string, sub: Partial<Subscription>, mode: Mode) {
    app.use(path, new MemoryService({ multi: true, startId: 1 }))
    const service: any = app.service(path)
    const action = vi.fn().mockName(`action ${path}`)
    const hook = trigger({ ...sub, action } as Subscription)

    if (mode === 'around') {
      service.hooks({ around: { patch: [hook] } })
    } else {
      service.hooks({ before: { patch: [hook] }, after: { patch: [hook] } })
    }

    return action
  }

  function changesOf(action: Mock) {
    return action.mock.calls.map(([{ item, before }]) => ({
      item: item.name,
      before: before?.name,
    }))
  }

  modes.forEach((mode) => {
    describe(mode, function () {
      beforeEach(function () {
        app = feathers()
      })

      const subs: [string, Partial<Subscription>][] = [
        ['fetchBefore', { fetchBefore: true }],
        ['before condition', { before: { done: false } }],
      ]

      subs.forEach(([label, sub]) => {
        it(`gives concurrent calls with one params object their own 'before' (${label})`, async function () {
          const action = use('tests', sub, mode)
          const items = await app.service('tests').create(
            Array.from({ length: 5 }, (_, i) => ({
              name: `${i}`,
              done: false,
            })),
          )

          const params = {}
          await Promise.all(
            items.map((item: any) =>
              app.service('tests').patch(item.id, { done: true }, params),
            ),
          )

          expect(
            changesOf(action).sort((a, b) => a.item.localeCompare(b.item)),
          ).toEqual(
            items.map((item: any) => ({ item: item.name, before: item.name })),
          )
        })
      })

      it("leaves the caller's params untouched", async function () {
        use('tests', { fetchBefore: true }, mode)
        const item = await app.service('tests').create({ name: 'a' })

        const params = { user: { id: 1 } }
        await app.service('tests').patch(item.id, { name: 'b' }, params)

        expect(params).toStrictEqual({ user: { id: 1 } })
      })

      it("does not hand the outer call's 'before' to a nested call", async function () {
        const inner = use('inner', { fetchBefore: true }, mode)
        use('outer', { fetchBefore: true }, mode)

        const innerItem = await app.service('inner').create({ name: 'inner' })
        const outerItem = await app.service('outer').create({ name: 'outer' })

        // registered after the trigger, so the outer 'before' is already fetched
        app.service('outer').hooks({
          before: {
            patch: [
              async (context) => {
                await app
                  .service('inner')
                  .patch(
                    innerItem.id,
                    { name: 'inner patched' },
                    { ...context.params },
                  )
              },
            ],
          },
        })

        await app
          .service('outer')
          .patch(outerItem.id, { name: 'outer patched' })

        expect(changesOf(inner)).toEqual([
          { item: 'inner patched', before: 'inner' },
        ])
      })
    })
  })
})
