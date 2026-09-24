import type { HookContext } from '@feathersjs/feathers'
import { mock as mockBeforeAfter } from './base-mock.js'
import { mock as mockAround } from './base-mock-around.js'

const modes = [
  { mode: 'before-after', mock: mockBeforeAfter },
  { mode: 'around', mock: mockAround },
] as const

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * `isBlocking`, `fetchBefore` and `debug` can be a boolean or a function
 * `(context) => Promisable<boolean>`, which is resolved once per call
 */
describe('trigger-resolve-options.test.ts', function () {
  modes.forEach(({ mode, mock }) => {
    describe(mode, function () {
      it('isBlocking: waits for the action by default', async function () {
        const order: string[] = []
        const { service } = mock('create', {
          action: async () => {
            await sleep(10)
            order.push('action')
          },
        })

        await service.create({ id: 0 })
        order.push('create')

        expect(order).toStrictEqual(['action', 'create'])
      })

      it("isBlocking: false doesn't wait for the action", async function () {
        const order: string[] = []
        const { service } = mock('create', {
          isBlocking: false,
          action: async () => {
            await sleep(10)
            order.push('action')
          },
        })

        await service.create({ id: 0 })
        order.push('create')
        await sleep(20)

        expect(order).toStrictEqual(['create', 'action'])
      })

      it('isBlocking: can be resolved from the context', async function () {
        const order: string[] = []
        const { service } = mock('create', {
          isBlocking: (context) => context.params.blocking === true,
          action: async () => {
            await sleep(10)
            order.push('action')
          },
        })

        // @ts-expect-error params not typed
        await service.create({ id: 0 }, { blocking: true })
        order.push('create')
        expect(order).toStrictEqual(['action', 'create'])

        order.length = 0
        await service.create({ id: 1 })
        order.push('create')
        await sleep(20)
        expect(order).toStrictEqual(['create', 'action'])
      })

      it('fetchBefore: can be resolved from the context', async function () {
        const befores: unknown[] = []
        const { service } = mock('patch', {
          fetchBefore: async (context) => context.params.fetchBefore === true,
          action: ({ before }) => {
            befores.push(before)
          },
        })

        await service.create({ id: 0, test: true })

        // @ts-expect-error params not typed
        await service.patch(0, { test: false }, { fetchBefore: true })
        await service.patch(0, { test: true })

        expect(befores).toStrictEqual([{ id: 0, test: true }, undefined])
      })

      it('debug: can be resolved from the context', async function () {
        const log = vi.spyOn(console, 'log').mockImplementation(() => {})
        try {
          const { service } = mock('create', {
            debug: (context) => context.params.debugTrigger === true,
            action: () => {},
          })

          await service.create({ id: 0 })
          expect(log).not.toHaveBeenCalled()

          // @ts-expect-error params not typed
          await service.create({ id: 1 }, { debugTrigger: true })
          expect(log).toHaveBeenCalledWith(
            '[FEATHERS_TRIGGER DEBUG]',
            expect.any(String),
            "service('tests').create()",
            'running action',
          )
        } finally {
          log.mockRestore()
        }
      })

      it('resolves the options once per call, with the context of the before hook', async function () {
        const types: Record<string, string[]> = {}
        const resolver = (name: string) => (context: HookContext) => {
          ;(types[name] ??= []).push(context.type as string)
          return true
        }

        const { service } = mock('patch', {
          isBlocking: resolver('isBlocking'),
          fetchBefore: resolver('fetchBefore'),
          debug: resolver('debug'),
          action: () => {},
        })

        await service.create({ id: 0, test: true })

        const log = vi.spyOn(console, 'log').mockImplementation(() => {})
        try {
          await service.patch(0, { test: false })
        } finally {
          log.mockRestore()
        }

        const type = mode === 'around' ? 'around' : 'before'
        expect(types).toStrictEqual({
          isBlocking: [type],
          fetchBefore: [type],
          debug: [type],
        })
      })

      it('passes the resolved options to the action', async function () {
        const action = vi.fn()
        const { service } = mock('create', {
          isBlocking: () => false,
          fetchBefore: async () => true,
          debug: () => false,
          action,
        })

        await service.create({ id: 0 })

        expect(action).toHaveBeenCalledTimes(1)
        const { subscription } = action.mock.calls[0][1]
        expect(subscription).toMatchObject({
          isBlocking: false,
          fetchBefore: true,
          debug: false,
        })
      })
    })
  })
})
