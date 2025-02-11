import { checkContext } from "feathers-hooks-common";
import type { ManipulateParams, Change } from "./changesById";
import {
  changesByIdBefore,
  changesByIdAfter,
  getOrFindByIdParams,
} from "./changesById";
import { replace as transformMustache } from "object-replace-mustache";
import sift from "sift";
import copy from "fast-copy";
import _set from "lodash/set.js";

import type {
  HookContext,
  Id,
  NextFunction,
  Paginated,
  ServiceInterface,
} from "@feathersjs/feathers";
import type { Promisable } from "../types.internal";

interface ViewContext<H extends HookContext = HookContext, T = any> {
  item: Change<T>;
  subscription: Subscription<H, T>;
  subscriptions: Subscription<H, T>[];
  items: Change<T>[];
  context: HookContext;
}

export type ActionOptions<H extends HookContext = HookContext, T = any> = {
  subscription: Subscription<H, T>;
  items: Change<T>[];
  context: H;
  view: Record<string, any>;
};

export type Action<H extends HookContext = HookContext, T = any> = (
  change: Change<T>,
  options: ActionOptions<H, T>,
) => Promisable<void>;

export type BatchAction<H extends HookContext = HookContext, T = any> = (
  changes: [change: Change<T>, options: ActionOptions<H, T>][],
  context: H,
) => Promisable<void>;

export type HookTriggerOptions<H extends HookContext = HookContext, T = any> =
  | Subscription<H, T>
  | (Subscription<H, T>[] & { batchMode?: never })
  | (((context: H) => Promisable<Subscription<H, T> | Subscription<H, T>[]>) & {
      batchMode?: never;
    });

export type TransformView<H extends HookContext = HookContext, T = any> =
  | undefined
  | ((
      view: Record<string, any>,
      viewContext: ViewContext<H, T>,
    ) => Promisable<Record<string, any>>)
  | Record<string, any>;

export type Condition<
  H extends HookContext = HookContext,
  T = Record<string, any>,
> = Record<string, any> | ((item: T, context: H) => Promisable<boolean>);

export type ConditionChange<
  H extends HookContext = HookContext,
  T = Record<string, any>,
> =
  | { item: Record<string, any>; before: Record<string, any> | undefined }
  | ((item: T, context: H) => Promisable<boolean>);

export interface SubscriptionBase<
  H extends HookContext = HookContext,
  T = Record<string, any>,
> {
  /**
   * The name of the subscription
   *
   * Can be used to filter subscriptions
   */
  name?: string;
  service?: string | string[];
  method?: string | string[];
  data?: Condition<H, T>;
  result?: ConditionChange<H, T>;
  before?: Condition<H, T>;
  params?: Condition<H, T>;
  view?: TransformView<H, T>;
  manipulateParams?: ManipulateParams;
  /** @default true */
  isBlocking?: boolean;
  /** @default false */
  fetchBefore?: boolean;

  /** @default false */
  debug?: boolean;

  [key: string]: any;

  [key: number]: any;
}

export type SubscriptionStandardMode<
  H extends HookContext = HookContext,
  T = Record<string, any>,
> = {
  batchMode?: false;
  action: Action<H, T>;
} & SubscriptionBase<H, T>;

export type SubscriptionBatchMode<
  H extends HookContext = HookContext,
  T = Record<string, any>,
> = {
  batchMode: true;
  action: BatchAction<H, T>;
} & SubscriptionBase<H, T>;

export type Subscription<
  H extends HookContext = HookContext,
  T = Record<string, any>,
> = SubscriptionStandardMode<H, T> | SubscriptionBatchMode<H, T>;

export const trigger = <
  H extends HookContext,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  T = H extends HookContext<infer App, infer S>
    ? S extends ServiceInterface<infer TT>
      ? TT extends Paginated<infer TTT>
        ? TTT
        : TT extends Array<infer TTT>
          ? TTT
          : TT
      : any
    : any,
  Options extends HookTriggerOptions<H, T> = HookTriggerOptions<H, T>,
>(
  options: Options,
) => {
  if (!options) {
    throw new Error("You should define subscriptions");
  }

  return async (context: H, next?: NextFunction): Promise<H> => {
    checkContext(
      context,
      null,
      ["create", "update", "patch", "remove"],
      "trigger",
    );

    if (context.type === "before") {
      return await triggerBefore(context, options);
    } else if (context.type === "after") {
      return await triggerAfter(context);
    } else if (context.type === "around" && next) {
      context = await triggerBefore(context, options);
      await next();
      context = await triggerAfter(context);
      return context;
    } else {
      return context;
    }
  };
};

const makeDebug = (sub: Subscription, context: HookContext) => {
  if (!sub.debug) {
    return () => {};
  }

  const prepend = [
    "[FEATHERS_TRIGGER DEBUG]",
    ...(sub.name ? [sub.name] : []),
    context.type,
    `service('${context.path}').${context.method}()`,
  ];

  return console.log.bind(console, ...prepend);
};

const triggerBefore = async <H extends HookContext, T = Record<string, any>>(
  context: H,
  options: HookTriggerOptions<H, T>,
): Promise<H> => {
  let subs = await getSubscriptions(context, options);

  if (!subs?.length) {
    return context;
  }

  let debug = false;

  if (!Array.isArray(context.data)) {
    const result: Subscription<H, T>[] = [];
    await Promise.all(
      subs.map(async (sub) => {
        if (sub.debug) {
          debug = true;
        }
        const log = makeDebug(sub as any, context);
        if (!sub.action) {
          log("skipping because no action provided");
          return;
        }

        if (
          sub.name &&
          context.params.skipTrigger &&
          (context.params.skipTrigger === sub.name ||
            (Array.isArray(context.params.skipTrigger) &&
              context.params.skipTrigger.includes(sub.name)))
        ) {
          log("skipping because of context.params.skipTrigger");
          return;
        }

        if (
          !(await testCondition({
            condition: sub.data,
            item: context.data,
            context,
            view: context,
          }))
        ) {
          log("skipping because of data mismatch");
          return;
        }

        if (
          !(await testCondition({
            condition: sub.params,
            item: context.params,
            context,
            view: context,
          }))
        ) {
          log("skipping because of params mismatch");
          return;
        }

        result.push(sub);
      }),
    );
    subs = result;
  }

  if (!subs?.length) {
    if (debug) {
      console.log(
        "[FEATHERS_TRIGGER DEBUG]",
        context.path,
        context.method,
        "skipping because no subscriptions left",
      );
    }
    return context;
  }

  for (const sub of subs) {
    const log = makeDebug(sub as any, context);

    sub.paramsResolved =
      (await getOrFindByIdParams(context, {
        params: sub.manipulateParams,
        deleteParams: ["trigger"],
        type: "before",
        skipHooks: false,
      })) ?? {};

    sub.identifier = JSON.stringify(sub.paramsResolved.query || {});
    if (context.params.changesById?.[sub.identifier]?.itemsBefore) {
      continue;
    }

    log("fetching before with 'changesByIdBefore'");

    const before = await changesByIdBefore(context, {
      skipHooks: false,
      params: () => (sub.paramsResolved ? sub.paramsResolved : null),
      deleteParams: ["trigger"],
      fetchBefore: sub.fetchBefore || !!sub.before,
    });

    _set(
      context,
      ["params", "changesById", sub.identifier, "itemsBefore"],
      before,
    );
  }

  setConfig(context, "subscriptions", subs);

  return context;
};

const triggerAfter = async <H extends HookContext>(context: H): Promise<H> => {
  const subs = getConfig(context, "subscriptions");
  if (!subs?.length) {
    return context;
  }

  const now = new Date();

  const promises: Promisable<any>[] = [];

  for (const sub of subs) {
    const log = makeDebug(sub, context);

    if (
      sub.name &&
      context.params.skipTrigger &&
      (context.params.skipTrigger === sub.name ||
        (Array.isArray(context.params.skipTrigger) &&
          context.params.skipTrigger.includes(sub.name)))
    ) {
      log("skipping because of context.params.skipTrigger");
      return context;
    }

    const itemsBefore =
      context.params.changesById?.[sub.identifier]?.itemsBefore;
    let changesById: Record<Id, Change> | undefined;
    if (itemsBefore) {
      log("fetching after with 'changesByIdAfter'");

      changesById = await changesByIdAfter(context, itemsBefore, null, {
        name: ["changesById", sub.identifier],
        params: sub.manipulateParams,
        skipHooks: false,
        deleteParams: ["trigger"],
        fetchBefore: sub.fetchBefore,
      });

      _set(context, ["params", "changesById", sub.identifier], changesById);
    }

    changesById = context.params.changesById?.[sub.identifier];

    if (!changesById) {
      log("no changesById");
      continue;
    }

    const changes = Object.values(changesById);

    const batchActionArguments: [change: Change, options: ActionOptions][] = [];

    for (const change of changes) {
      const { before } = change;
      const { item } = change;

      const changeForSub = change;

      let mustacheView: Record<string, unknown> = {
        item,
        before,
        data: context.data,
        id: context.id,
        method: context.method,
        now,
        params: context.params,
        path: context.path,
        service: context.service,
        type: context.type,
        user: context.params?.user,
      };

      if (sub.view) {
        if (typeof sub.view === "function") {
          mustacheView = await sub.view(mustacheView, {
            item: changeForSub,
            items: changes,
            subscription: sub,
            subscriptions: subs,
            context,
          });
        } else {
          mustacheView = Object.assign(mustacheView, sub.view);
        }
      }

      if (
        !(await testCondition({
          item,
          before,
          withBefore: true,
          condition: sub.result,
          context,
          view: mustacheView,
        }))
      ) {
        log("skipping because of result mismatch");
        continue;
      }

      if (
        !(await testCondition({
          item,
          before,
          testItem: "before",
          condition: sub.before,
          context,
          view: mustacheView,
        }))
      ) {
        log("skipping because of before mismatch", before);
        continue;
      }

      if (isSubscriptionInBatchMode(sub)) {
        log("adding to batchActionArguments");
        batchActionArguments.push([
          changeForSub,
          {
            subscription: sub,
            items: changes,
            context,
            view: mustacheView,
          },
        ]);
      } else if (isSubscriptionNormalMode(sub)) {
        const _action = sub.action;

        log("running action");

        const promise = _action(changeForSub, {
          subscription: sub,
          items: changes,
          context,
          view: mustacheView,
        });

        if (sub.isBlocking) {
          promises.push(promise);
        }
      }
    }

    if (isSubscriptionInBatchMode(sub) && batchActionArguments.length) {
      log("running batch action");
      const promise = sub.action(batchActionArguments, context);

      if (sub.isBlocking) {
        promises.push(promise);
      }
    }
  }

  await Promise.all(promises);

  return context;
};

function setConfig(
  context: HookContext,
  key: "subscriptions",
  val: Subscription<any, any>[],
): void;
function setConfig(context: HookContext, key: string, val: unknown): void {
  context.params.trigger = context.params.trigger || {};
  context.params.trigger[key] = val;
}

function getConfig(
  context: HookContext,
  key: "subscriptions",
): undefined | Subscription[];
function getConfig(
  context: HookContext,
  key: string,
): undefined | Subscription[] {
  return context.params.trigger?.[key];
}

const defaultSubscription: Partial<Subscription> = {
  name: undefined,
  isBlocking: true,
  batchMode: false,
  identifier: "default",
  fetchBefore: false,
};

const getSubscriptions = async <H extends HookContext, T = any>(
  context: H,
  options: HookTriggerOptions<H, T>,
): Promise<undefined | Subscription<H, T>[]> => {
  const _subscriptionOrSubscriptions =
    typeof options === "function" ? await options(context) : options;

  if (!_subscriptionOrSubscriptions) {
    return;
  }

  const _subscriptions = Array.isArray(_subscriptionOrSubscriptions)
    ? _subscriptionOrSubscriptions
    : [_subscriptionOrSubscriptions];

  const subscriptions = _subscriptions.map(
    (x) => Object.assign({}, defaultSubscription, x) as Subscription<H, T>,
  );

  const { path, method } = context;

  return subscriptions.filter((sub) => {
    if (
      sub.service &&
      ((typeof sub.service === "string" && sub.service !== path) ||
        (Array.isArray(sub.service) && !sub.service.includes(path)))
    ) {
      return false;
    }
    if (
      sub.method &&
      ((typeof sub.method === "string" && sub.method !== method) ||
        (Array.isArray(sub.method) && !sub.method.includes(method)))
    ) {
      return false;
    }

    return true;
  });
};

const isSubscriptionInBatchMode = (
  sub: Subscription,
): sub is SubscriptionBatchMode => !!sub.batchMode;

const isSubscriptionNormalMode = (
  sub: Subscription,
): sub is SubscriptionStandardMode => !sub.batchMode;

type TestConditionOptions = {
  item: any;
  testItem?: "item" | "before";
  before?: any;
  withBefore?: boolean;
  condition: Condition | ConditionChange | undefined;
  context: HookContext;
  view: Record<string, any>;
};

const testCondition = async (
  options: TestConditionOptions,
): Promise<boolean> => {
  if (options.condition === undefined) {
    return true;
  }

  const { item, before, context, testItem = "item" } = options;

  if (typeof options.condition === "function") {
    const data = options.withBefore ? { item, before } : item;
    return await options.condition(data, context);
  }

  const condition = copy(options.condition);
  return sift(transformMustache(condition, options.view))(options[testItem]);
};
