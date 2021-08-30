import type { HookContext, Params } from "@feathersjs/feathers";

export type MethodName = "create" | "update" | "patch" | "remove";

export type Change<T = unknown> = {
  before: T
  item: T
}

export type ChangesById<T = unknown> = {
    [key: string]: Change<T>
    [key: number]: Change<T>
}

export type ManipulateParams = (params: Params, context: HookContext) => (Params | Promise<Params>)

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

export type TransformView<T = unknown> = 
  undefined | 
  ((view: Record<string, unknown>, viewContext: ViewContext<T>) => Promise<Record<string, unknown>>) | 
  Record<string, unknown>

export interface HookNotifyOptions<T> {
  subscriptions: Subscription[] | ((context: HookContext, items: Change<T>[]) => Promise<Subscription[]>)
  /*
   * Option to manipulate the items
   */
  items?: (items: Change<T>[], subscriptions: Subscription[], context: HookContext) => Promise<Change<T>[]>
  notify: (item: Change<T>, subscriptions: Subscription[], items: Change<T>[], context: HookContext) => (void | Promise<void>)
  view?: TransformView<T>
  refetchItems?: (context: HookContext) => boolean | Promise<boolean>,
  params?: ManipulateParams
  isBlocking?: boolean
}

export interface Subscription {
  service: string | string[]
  method: string | string[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: number]: any
  conditions?: Record<string, unknown>
  conditionsBefore?: Record<string, unknown>
}