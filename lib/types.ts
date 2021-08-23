import type { HookContext, Params } from "@feathersjs/feathers";

export type MethodName = "create" | "update" | "patch" | "remove";

export type Change<T> = {
  before: T
  after: T
}

export type ChangesById<T> = {
    [key: string]: Change<T>
    [key: number]: Change<T>
}

export type ManipulateParams = (params: Params, context: HookContext) => (Promise<Params>)

export interface HookChangesByIdOptions {
  removeSelect: boolean
  skipHooks: boolean
  refetchItems: boolean
  params?: ManipulateParams
}

interface ViewContext<T> {
  item: Change<T>, 
  subscription: Subscription,
  subscriptions: Subscription[], 
  items: Change<T>[], 
  context: HookContext
}

export type TransformView<T> = undefined | ((view: Record<string, unknown>, viewContext: ViewContext<T>) => Promise<Record<string, unknown>>) | Record<string, unknown>

export interface HookNotifyOptions<T> {
  subscriptions: Subscription[] | ((context: HookContext, items: Change<T>[]) => Promise<Subscription[]>)
    /*
     * Option to manipulate the items
     */
  items?: (items: Change<T>[], subscriptions: Subscription[], context: HookContext) => Promise<Change<T>[]>
  notify: (item: Change<T>, subscriptions: Subscription[], items: Change<T>[], context: HookContext) => Promise<void>
  view?: TransformView<T>
  refetchItems?: (context: HookContext) => boolean | Promise<boolean>,
  params?: ManipulateParams
  isBlocking?: boolean
}

export interface SubscriptionBasic {
  service: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: number]: any
}

export type Subscription = SubscriptionCreate | SubscriptionUpdate | SubscriptionRemove;
export interface SubscriptionCreate extends SubscriptionBasic {
  method: "create"
  conditionsAfter?: Record<string, unknown>
}

export interface SubscriptionUpdate extends SubscriptionBasic {
  method: "update" | "patch"
  conditionsBefore?: Record<string, unknown>
  conditionsAfter?: Record<string, unknown>
  fields?: string[]
}

export interface SubscriptionRemove extends SubscriptionBasic {
  method: "remove"
  conditionsBefore?: Record<string, unknown>
}