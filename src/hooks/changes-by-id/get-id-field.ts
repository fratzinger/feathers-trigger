import type { HookContext } from '@feathersjs/feathers'

export const getIdField = (context: Pick<HookContext, 'service'>): string => {
  return context.service.options.id
}
