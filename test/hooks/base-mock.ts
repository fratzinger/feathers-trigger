import type { HookTriggerOptions } from '../../src/index.js'
import { trigger } from '../../src/index.js'
import { MemoryService } from '@feathersjs/memory'
import type { HookContext } from '@feathersjs/feathers'
import { feathers } from '@feathersjs/feathers'
import type { MethodName } from '../../src/types.internal.js'

export type MockOptions = {
  before?: (context: HookContext) => Promise<HookContext>
  after?: (context: HookContext) => Promise<HookContext>
}

export function mock(
  hookNames: MethodName | MethodName[],
  options: HookTriggerOptions,
  mockOptions?: MockOptions,
) {
  hookNames = Array.isArray(hookNames) ? hookNames : [hookNames]
  const app = feathers()
  app.use('/tests', new MemoryService({ multi: true }))
  const service = app.service('tests')
  const hook = trigger(options)

  const hooks = {
    around: {},
    before: {},
    after: {},
  }

  hookNames.forEach((hookName) => {
    hooks.before[hookName] = [
      hook,
      ...(mockOptions?.before ? [mockOptions.before] : []),
    ]
    hooks.after[hookName] = [
      hook,
      ...(mockOptions?.after ? [mockOptions.after] : []),
    ]
  })

  service.hooks(hooks)

  return {
    app,
    service,
  }
}
