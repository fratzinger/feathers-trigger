import type { HookContext, Params } from "@feathersjs/feathers";
import type { Promisable } from "type-fest";

export type MethodName = "create" | "update" | "patch" | "remove";

export type Change<T = any> = {
  before: T
  item: T
}

export type ChangesById<T = any> = {
  [key: string]: Change<T>
  [key: number]: Change<T>
}

export type ManipulateParams = 
  (params: Params, context: HookContext) => (Promisable<Params>)

export interface HookChangesByIdOptions {
  skipHooks: boolean
  params?: ManipulateParams
  deleteParams?: string[]
  name?: string | string[]
  /** @default false */
  fetchBefore?: boolean
}

interface ViewContext<T = any> {
  item: Change<T>, 
  subscription: Subscription,
  subscriptions: Subscription[],
  items: Change<T>[], 
  context: HookContext
}

export type ActionOptions<T = any> = { 
  subscription?: SubscriptionResolved, 
  items?: Change<T>[], 
  context?: HookContext 
}

export type Action<T = any> = (item: Change<T>, options?: ActionOptions<T>) => (Promisable<void>);

export type HookTriggerOptions = 
  Subscription | 
  Subscription[] | 
  ((context: HookContext) => Promisable<Subscription | Subscription[]>)

export type TransformView<T = any> = 
  undefined | 
  ((view: Record<string, any>, viewContext: ViewContext<T>) => Promisable<Record<string, any>>) | 
  Record<string, any>

export type Condition = 
  true | 
  Record<string, any> | 
  ((item: any, context: HookContext) => Promisable<boolean>)

export interface Subscription {
  service?: string | string[]
  method?: string | string[]
  conditionsData?: Condition
  conditionsResult?: Condition
  conditionsBefore?: Condition
  view?: TransformView
  params?: ManipulateParams
  /** @default true */
  isBlocking?: boolean
  action?: Action
  /** @default false */
  fetchBefore?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: number]: any
}

export interface SubscriptionResolved extends Subscription {
  dataResolved: boolean | Record<string, any>
  resultResolved: boolean | Record<string, any>
  beforeResolved: boolean | Record<string, any>
  paramsResolved: Params
  identifier: string
}