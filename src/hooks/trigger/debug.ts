import type { HookContext } from '@feathersjs/feathers'
import type { SubscriptionResolved } from './types.js'

/**
 * A logger for the subscription, that only logs if `debug` is set
 */
export const makeDebug = (
  sub: Pick<SubscriptionResolved, 'name' | 'debug'>,
  context: HookContext,
) => {
  if (!sub.debug) {
    return () => {}
  }

  const prepend = [
    '[FEATHERS_TRIGGER DEBUG]',
    ...(sub.name ? [sub.name] : []),
    context.type,
    `service('${context.path}').${context.method}()`,
  ]

  return console.log.bind(console, ...prepend)
}

if (import.meta.vitest) {
  const { describe, it, expect, vi, afterEach } = import.meta.vitest

  describe('makeDebug', function () {
    const context = {
      type: 'before',
      path: 'tests',
      method: 'create',
    } as HookContext

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it("doesn't log without debug", function () {
      const log = vi.spyOn(console, 'log').mockImplementation(() => {})
      makeDebug({ debug: false }, context)('hello')
      expect(log).not.toHaveBeenCalled()
    })

    it('prepends the name, the hook type and the service call', function () {
      const log = vi.spyOn(console, 'log').mockImplementation(() => {})
      makeDebug({ debug: true, name: 'sub1' }, context)('hello')
      expect(log).toHaveBeenCalledWith(
        '[FEATHERS_TRIGGER DEBUG]',
        'sub1',
        'before',
        "service('tests').create()",
        'hello',
      )
    })
  })
}
