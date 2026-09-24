import { shouldSkip } from 'feathers-utils/predicates'
import type { HookContext, Id, NextFunction } from '@feathersjs/feathers'
import { get, set } from '../../utils.internal/index.js'
import { changesByIdAfter } from './after.js'
import { changesByIdBefore } from './before.js'
import { defaultOptions } from './default-options.js'
import type { Change, HookChangesByIdOptions } from './types.js'

export const changesById = <H extends HookContext, T = any>(
  cb: (changesById: Record<Id, Change<T>>, context: H) => void | Promise<void>,
  _options?: Partial<HookChangesByIdOptions<H>>,
) => {
  const options = {
    ...defaultOptions,
    ..._options,
  }

  return async (context: H, next?: NextFunction): Promise<H> => {
    if (shouldSkip('checkMulti')(context)) {
      return context
    }

    const pathBefore = getPath(options.name, true)

    if (context.type === 'before' || context.type === 'around') {
      const changes = await changesByIdBefore(context, options)
      if (!changes) {
        return context
      }

      set(context, pathBefore, changes)
    }

    if (next) {
      await next()
    }

    if (context.type === 'after' || context.type === 'around') {
      const itemsBefore = get(context, pathBefore)
      const changes = await changesByIdAfter(context, itemsBefore, cb, options)
      if (!changes) {
        return context
      }

      set(context, getPath(options.name, false), changes)
    }

    return context
  }
}

/**
 * Where in the context the items before (`isBefore`) or the changes are stored
 */
const getPath = (
  path: string | string[],
  isBefore: boolean,
): string | string[] => {
  if (isBefore) {
    if (typeof path === 'string') {
      return `params.${path}.itemsBefore`
    } else {
      return ['params', ...path, 'itemsBefore']
    }
  } else {
    if (typeof path === 'string') {
      return `params.${path}`
    } else {
      return ['params', ...path]
    }
  }
}

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest

  describe('getPath', function () {
    it('points to the items before in params', function () {
      expect(getPath('changesById', true)).toBe(
        'params.changesById.itemsBefore',
      )
      expect(getPath(['changesById', '{"a.b":1}'], true)).toStrictEqual([
        'params',
        'changesById',
        '{"a.b":1}',
        'itemsBefore',
      ])
    })

    it('points to the changes in params', function () {
      expect(getPath('changesById', false)).toBe('params.changesById')
      expect(getPath(['changesById', '{"a.b":1}'], false)).toStrictEqual([
        'params',
        'changesById',
        '{"a.b":1}',
      ])
    })
  })
}
