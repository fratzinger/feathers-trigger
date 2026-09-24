import type { HookContext } from '@feathersjs/feathers'
import type { Change, ManipulateParams } from '../changes-by-id/index.js'
import type {
  DistributiveOmit,
  MaybeArray,
  Promisable,
} from '../../types.internal.js'

export type ActionOptions<H extends HookContext = HookContext, T = any> = {
  subscription: SubscriptionResolved<H, T>
  items: Change<T>[]
  context: H
}

export type Action<H extends HookContext = HookContext, T = any> = (
  change: Change<T>,
  options: ActionOptions<H, T>,
) => Promisable<void>

export type BatchAction<H extends HookContext = HookContext, T = any> = (
  changes: [change: Change<T>, options: ActionOptions<H, T>][],
  context: H,
) => Promisable<void>

export type HookTriggerOptions<H extends HookContext = HookContext, T = any> =
  | MaybeArray<Subscription<H, T>>
  | ((context: H) => Promisable<MaybeArray<Subscription<H, T>>>)

/**
 * A boolean, or a function that resolves it from the context. The function is
 * called once per service call, in the before hook.
 */
export type ResolvableBoolean<H extends HookContext = HookContext> =
  boolean | ((context: H) => Promisable<boolean>)

export type Condition<
  H extends HookContext = HookContext,
  T = Record<string, any>,
> =
  | Record<string, any>
  | boolean
  | ((item: T, context: H) => Promisable<boolean | Record<string, any>>)

export type ConditionChange<
  H extends HookContext = HookContext,
  T = Record<string, any>,
> =
  | Record<string, any>
  | boolean
  | ((
      change: {
        item: T
        before: T | undefined
      },
      context: H,
    ) => Promisable<boolean | Record<string, any>>)

export interface SubscriptionBase<
  H extends HookContext = HookContext,
  T = Record<string, any>,
> {
  /**
   * The name of the subscription
   *
   * Can be used to filter subscriptions
   */
  name?: string
  service?: string | string[]
  method?: string | string[]

  data?: Condition<H, T>
  result?: ConditionChange<H, T>
  before?: Condition<H, T>
  params?: Condition<H, T>

  manipulateParams?: ManipulateParams
  /**
   * @default true
   */
  isBlocking?: ResolvableBoolean<H>
  /**
   * @default false
   */
  fetchBefore?: ResolvableBoolean<H>

  /**
   * @default false
   */
  debug?: ResolvableBoolean<H>
}

export type SubscriptionSingleAction<
  H extends HookContext = HookContext,
  T = Record<string, any>,
> = {
  action: Action<H, T>
} & SubscriptionBase<H, T>

export type SubscriptionBatchAction<
  H extends HookContext = HookContext,
  T = Record<string, any>,
> = {
  batchAction: BatchAction<H, T>
} & SubscriptionBase<H, T>

export type Subscription<
  H extends HookContext = HookContext,
  T = Record<string, any>,
> = SubscriptionSingleAction<H, T> | SubscriptionBatchAction<H, T>

export type SubscriptionResolved<
  H extends HookContext = HookContext,
  T = Record<string, any>,
> = DistributiveOmit<
  Subscription<H, T>,
  'isBlocking' | 'fetchBefore' | 'debug'
> & {
  isBlocking: boolean
  fetchBefore: boolean
  debug: boolean
  identifier?: string
  paramsResolved?: Record<string, any>
  /**
   * multi create only: every item of `context.data` and whether it matched
   * `data`. Only set if some items matched and some didn't
   */
  dataMatches?: { item: any; isMatch: boolean }[]
}
