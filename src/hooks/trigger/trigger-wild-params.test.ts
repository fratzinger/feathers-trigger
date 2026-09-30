import type { Application, HookContext } from '@feathersjs/feathers'
import { feathers } from '@feathersjs/feathers'
import { MemoryService } from '@feathersjs/memory'
import type { Mock } from 'vitest'
import type { Subscription } from './types.js'
import { trigger } from './trigger.js'

type Mode = 'before-after' | 'around'

const modes: Mode[] = ['before-after', 'around']

const [startsWithA, startsWithB] = [/^a/, /^b/]

/** like a casl ability: a class instance with methods and hidden state */
class Ability {
  #rules: unknown[]
  ability = this
  constructor(rules: unknown[]) {
    this.#rules = rules
  }
  can() {
    return this.#rules.length > 0
  }
}

/** like a sentry span: a class instance referencing itself through its tree */
class Span {
  op = 'feathers.patch'
  tree: { span: Span; children: Span[] }
  constructor() {
    this.tree = { span: this, children: [this] }
  }
  end() {}
}

/**
 * Whatever ends up on `params` or in the query - casl and sentry put class
 * instances, functions and self-references there - the subscriptions share
 * the 'before' items only if they fetch them with equal queries.
 */
describe('trigger-wild-params.test.ts', function () {
  let app: Application
  let service: any

  /** the `$wild` of the query of every find that fetched the 'before' items */
  let fetchesBefore: unknown[]

  function mock(mode: Mode, subs: Partial<Subscription>[]) {
    app = feathers()
    app.use('tests', new MemoryService({ multi: true, startId: 1 }))
    service = app.service('tests')
    fetchesBefore = []

    // like the hooks of casl, consumes `$wild` before it reaches the adapter
    app.hooks({
      before: {
        find: [
          (context: HookContext) => {
            const { $wild, ...query } = context.params.query ?? {}
            // the refetch after the call is by id
            if (!('id' in query)) {
              fetchesBefore.push($wild)
            }
            context.params.query = query
          },
        ],
      },
    })

    const actions = subs.map((_, i) => vi.fn().mockName(`action ${i}`))
    const hooks = subs.map((sub, i) =>
      trigger({ ...sub, action: actions[i] } as Subscription),
    )

    if (mode === 'around') {
      service.hooks({ around: { patch: hooks } })
    } else {
      service.hooks({ before: { patch: hooks }, after: { patch: hooks } })
    }

    return actions
  }

  function changesOf(action: Mock) {
    return action.mock.calls.map(([{ item, before }]) => ({
      item: item.name,
      before: before?.name,
    }))
  }

  const withQuery =
    (query: Record<string, unknown>) =>
    (params: any): any => ({ ...params, query: { ...params.query, ...query } })

  modes.forEach((mode) => {
    describe(mode, function () {
      it("gives subs with different RegExp queries their own 'before'", async function () {
        const [a, b] = mock(mode, [
          {
            fetchBefore: true,
            manipulateParams: withQuery({ name: startsWithA }),
          },
          {
            fetchBefore: true,
            manipulateParams: withQuery({ name: startsWithB }),
          },
        ])
        await service.create([{ name: 'a' }, { name: 'b' }])

        await service.patch(null, { done: true })

        expect(changesOf(a)).toEqual([{ item: 'a', before: 'a' }])
        expect(changesOf(b)).toEqual([{ item: 'b', before: 'b' }])
      })

      it('works with a BigInt in the query', async function () {
        const [action] = mock(mode, [{ fetchBefore: true }])
        await service.create([{ name: 'a' }, { name: 'b' }])

        await service.patch(
          null,
          { done: true },
          { query: { id: { $ne: 99n } } },
        )

        expect(changesOf(action)).toEqual([
          { item: 'a', before: 'a' },
          { item: 'b', before: 'b' },
        ])
      })

      it('works with self-references and functions on params', async function () {
        const ability = new Ability([{ action: 'manage' }])
        const [action] = mock(mode, [
          {
            fetchBefore: true,
            // a fresh span for the fetch, looking just like the one of the call
            manipulateParams: (params: any) => ({
              ...params,
              span: new Span(),
            }),
          },
        ])
        const item = await service.create({ name: 'a' })

        await service.patch(
          item.id,
          { name: 'b' },
          { ability, span: new Span() },
        )

        expect(changesOf(action)).toEqual([{ item: 'b', before: 'a' }])
      })

      it("shares 'before' for self-references and functions in the query", async function () {
        const wild: any = { ability: new Ability([]), check: () => true }
        wild.self = wild

        const actions = mock(mode, [
          { fetchBefore: true, manipulateParams: withQuery({ $wild: wild }) },
          { fetchBefore: true, manipulateParams: withQuery({ $wild: wild }) },
        ])
        await service.create([{ name: 'a' }])

        await service.patch(null, { done: true })

        expect(fetchesBefore).toStrictEqual([wild])
        actions.forEach((action) =>
          expect(changesOf(action)).toEqual([{ item: 'a', before: 'a' }]),
        )
      })

      it("doesn't share 'before' for different functions or class instances in the query", async function () {
        const makeWild = () => {
          const wild: any = { ability: new Ability([]), check: () => true }
          wild.self = wild
          return wild
        }
        const [wild0, wild1] = [makeWild(), makeWild()]

        mock(mode, [
          { fetchBefore: true, manipulateParams: withQuery({ $wild: wild0 }) },
          { fetchBefore: true, manipulateParams: withQuery({ $wild: wild1 }) },
        ])
        await service.create([{ name: 'a' }])

        await service.patch(null, { done: true })

        expect(fetchesBefore).toStrictEqual([wild0, wild1])
      })
    })
  })
})
