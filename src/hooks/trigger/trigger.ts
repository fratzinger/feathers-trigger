import { checkContext } from 'feathers-utils'
import type {
  HookContext,
  NextFunction,
  Paginated,
  ServiceInterface,
} from '@feathersjs/feathers'
import { triggerAfter } from './after.js'
import { triggerBefore } from './before.js'
import type { HookTriggerOptions } from './types.js'

let hookIdCounter = 0

export const trigger = <
  H extends HookContext,
  T = H extends HookContext<any, infer S>
    ? S extends ServiceInterface<infer TT>
      ? TT extends Paginated<infer TTT>
        ? TTT
        : TT extends Array<infer TTT>
          ? TTT
          : TT
      : any
    : any,
>(
  options: HookTriggerOptions<H, T>,
) => {
  if (!options) {
    throw new Error('You should define subscriptions')
  }

  // every `trigger()` hook gets its own slot in `context.params.trigger`, so
  // that multiple trigger hooks can be registered next to each other
  const hookId = `${hookIdCounter++}`

  return async (context: H, next?: NextFunction): Promise<H> => {
    checkContext(
      context,
      null,
      ['create', 'update', 'patch', 'remove'],
      'trigger',
    )

    if (context.type === 'before') {
      return await triggerBefore(context, options, hookId)
    } else if (context.type === 'after') {
      return await triggerAfter(context, hookId)
    } else if (context.type === 'around' && next) {
      context = await triggerBefore(context, options, hookId)
      await next()
      context = await triggerAfter(context, hookId)
      return context
    } else {
      return context
    }
  }
}
