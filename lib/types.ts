import type { HookContext, Params } from "@feathersjs/feathers";
import type { Promisable } from "type-fest";

export type MethodName = "create" | "update" | "patch" | "remove";

export type Change<T = unknown> = {
  before: T
  item: T
}

export type ChangesById<T = unknown> = {
    [key: string]: Change<T>
    [key: number]: Change<T>
}

export type ManipulateParams = (params: Params, context: HookContext) => (Promisable<Params>)

export interface HookChangesByIdOptions {
  skipHooks: boolean
  refetchItems: boolean
  params?: ManipulateParams
}

interface ViewContext<T = unknown> {
  item: Change<T>, 
  subscription: Subscription,
  subscriptions: Subscription[],
  items: Change<T>[], 
  context: HookContext
}

export type CallAction<T = unknown> = (item: Change<T>, subscription: Subscription, items: Change<T>[], context: HookContext) => (Promisable<void>);

export type HookTriggerOptions = Subscription | Subscription[] | ((context: HookContext) => Promisable<Subscription | Subscription[]>)

export type TransformView<T = unknown> = 
  undefined | 
  ((view: Record<string, unknown>, viewContext: ViewContext<T>) => Promisable<Record<string, unknown>>) | 
  Record<string, unknown>

export type TransformParams =
  undefined |
  ((item: Record<string, unknown>, subscription: Subscription, items: Record<string, unknown>[], subscriptions: Subscription[]) => Promisable<Params>) |
  Params

export interface Subscription {
  service?: string | string[]
  method?: string | string[]
  conditionsData?: true | Record<string, unknown>
  conditionsResult?: true | Record<string, unknown>
  conditionsBefore?: true | Record<string, unknown>
  view?: TransformView
  params?: TransformParams
  isBlocking?: boolean
  callAction: CallAction
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: number]: any
}