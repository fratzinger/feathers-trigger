import type { HookContext, Params } from '@feathersjs/feathers'
import type { Promisable } from '../../types.internal.js'

export type Change<T = any> = {
  before: T
  item: T
}

export type ChangesById<T = any> = {
  [key: string]: Change<T>
  [key: number]: Change<T>
}

export type ManipulateParams<H extends HookContext = HookContext> = (
  params: Params,
  context: H,
) => Promisable<Params | null>

export interface HookChangesByIdOptions<H extends HookContext = HookContext> {
  /**
   * @default false
   */
  skipHooks: boolean
  params?: ManipulateParams<H>
  /**
   * @default []
   */
  deleteParams?: string[]
  /**
   * The name of the property to store the changesById in context.params
   *
   * @default "changesById"
   */
  name?: string | string[]
  /**
   * @default false
   */
  fetchBefore?: boolean
}

export interface ChangesByIdParams extends Params {
  changesById: any
}

declare module '@feathersjs/feathers' {
  interface Params {
    paginate?: any
    changesById?: any
  }
}

export type GetOrFindByIdParamsOptions<H extends HookContext = HookContext> =
  Pick<HookChangesByIdOptions<H>, 'params' | 'skipHooks' | 'deleteParams'> & {
    type: 'before' | 'after'
  }

export type GetOrFindByIdOptions<H extends HookContext = HookContext> =
  GetOrFindByIdParamsOptions<H> & {
    byId?: boolean
  }
