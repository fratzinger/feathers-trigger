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

export type ManipulateParams = (params: Params, context: HookContext) => (Promisable<Params>)

export interface HookChangesByIdOptions {
  skipHooks: boolean
  refetchItems: boolean
  params?: ManipulateParams
}

interface ViewContext<T = any> {
  item: Change<T>, 
  subscription: Subscription,
  subscriptions: Subscription[],
  items: Change<T>[], 
  context: HookContext
}

export type CallActionOptions<T = any> = { 
  subscription?: Subscription, 
  items?: Change<T>[], 
  context?: HookContext 
}

export type CallAction<T = any> = (item: Change<T>, options?: CallActionOptions<T>) => (Promisable<void>);

export type HookTriggerOptions = Subscription | Subscription[] | ((context: HookContext) => Promisable<Subscription | Subscription[]>)

export type TransformView<T = any> = 
  undefined | 
  ((view: Record<string, any>, viewContext: ViewContext<T>) => Promisable<Record<string, any>>) | 
  Record<string, any>

export type TransformParams =
  undefined |
  ((item: Record<string, any>, subscription: Subscription, items: Record<string, any>[], subscriptions: Subscription[]) => Promisable<Params>) |
  Params

export interface Subscription {
  service?: string | string[]
  method?: string | string[]
  conditionsData?: true | Record<string, any>
  conditionsResult?: true | Record<string, any>
  conditionsBefore?: true | Record<string, any>
  view?: TransformView
  params?: TransformParams
  isBlocking?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: number]: any
}